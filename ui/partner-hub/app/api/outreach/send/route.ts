import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { dispatchSendRequest } from "@/lib/outreach/relay-send";
import { generateTrackingToken } from "@/lib/outreach/tokens";
import { trackingPixelUrl, trackingClickUrl } from "@/lib/outreach/urls";
import { markStatus } from "@/lib/outreach/prospects";
import { escapeHtml, mergeTemplateText } from "@/lib/outreach/merge";
import { getTemplate } from "@/lib/outreach/templates";
import {
  checkSendable,
  computeSequence,
  deliveredAtFromEvents,
  DEFAULT_DELAYS,
  stopSignalFromEvents,
  SEQUENCE_STEPS,
  type ProspectStatusName,
  type SequenceStep,
} from "@/lib/outreach/sequence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SendBody {
  campaignId: number;
  prospectIds: number[];
  templateId: number;
  /** Which email in the sequence this send is (1, 2 or 3). Defaults to 1. */
  step?: number;
  /** Subject as edited in the dashboard's review step (may differ from the template's default). */
  subject: string;
  /** HTML as edited in the dashboard's review step -- still has {{FIRST_NAME}} etc. unmerged. */
  html: string;
  /**
   * Must be true to resend to a contact whose earlier request for this
   * email was never confirmed -- the person has to acknowledge they checked
   * it didn't go out (Sent Items), since the app can't be sure.
   */
  confirmUnverified?: boolean;
}

/**
 * At most this many contacts per request. The Power Automate send-flow
 * dropped ~80% of a 74-contact burst queued in the same second (Oct 1), so
 * the dashboard sends in small chunks with a pause between them, and this
 * cap keeps any other caller from bursting either.
 */
const MAX_PROSPECTS_PER_SEND = 5;

/** Pause between individual send requests within one call. */
const PAUSE_BETWEEN_SENDS_MS = 1_500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Requests the outreach send for the given prospects, one at a time via the
 * Resend-relayed Power Automate send-flow (see relay-send.ts).
 * Intentionally sequential (not Promise.all), same reasoning as before:
 * stays well under mailbox send-rate limits and keeps partial failures easy
 * to read out of the response.
 *
 * The *content* is not re-derived from templateId here: `subject` and
 * `html` come from the request body -- whatever the dashboard's
 * template-picker + edit step produced. templateId is only checked to
 * belong to the same campaign as the prospects being sent to
 * (OutreachMessage.subject already captures the final, edited subject);
 * the edited content is what's authoritative for the actual send, exactly
 * as reviewed on screen, not whatever the template row currently says (it
 * may have been edited again since).
 *
 * This still does NOT confirm the email actually went out from
 * jsiejk@ddn.com -- it only confirms the send *request*, carrying the
 * fully rendered HTML, reached the relay inbox. A prospect lands in
 * SENDING here and only advances to SENT once the send-flow's confirmation
 * notification comes back through the IMAP poller (see imap-poller.ts).
 */
export async function POST(req: Request) {
  const mailbox = process.env.SC26_MAILBOX;
  const senderName = process.env.SC26_SENDER_NAME || mailbox || "DDN";
  if (!mailbox) {
    return NextResponse.json({ ok: false, error: "SC26_MAILBOX is not configured." }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as SendBody | null;
  const campaignId = body?.campaignId;
  const prospectIds = body?.prospectIds;
  const templateId = body?.templateId;
  const subjectSource = body?.subject?.trim();
  const htmlSource = body?.html;
  const stepRaw = body?.step ?? 1;

  if (!Number.isInteger(campaignId)) {
    return NextResponse.json({ ok: false, error: "Missing campaignId." }, { status: 400 });
  }
  if (!SEQUENCE_STEPS.includes(stepRaw as SequenceStep)) {
    return NextResponse.json({ ok: false, error: "step must be 1, 2 or 3." }, { status: 400 });
  }
  const step = stepRaw as SequenceStep;
  if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
    return NextResponse.json({ ok: false, error: "No prospects selected." }, { status: 400 });
  }
  if (prospectIds.length > MAX_PROSPECTS_PER_SEND) {
    return NextResponse.json(
      { ok: false, error: `At most ${MAX_PROSPECTS_PER_SEND} contacts per send request (the dashboard sends larger selections in paced chunks).` },
      { status: 400 }
    );
  }
  const confirmUnverified = body?.confirmUnverified === true;
  if (!Number.isInteger(templateId)) {
    return NextResponse.json({ ok: false, error: "No template selected." }, { status: 400 });
  }
  if (!subjectSource) {
    return NextResponse.json({ ok: false, error: "Subject is empty." }, { status: 400 });
  }
  if (!htmlSource || !htmlSource.trim()) {
    return NextResponse.json({ ok: false, error: "Email body is empty." }, { status: 400 });
  }
  // Referenced only to fail fast on a stale/unknown/wrong-campaign id from
  // the client (e.g. a template deleted, or belonging to a different
  // campaign than the one being sent for, since the page loaded) -- see
  // the docstring above for why the fetched template's content itself
  // isn't what gets sent.
  const template = await getTemplate(templateId as number);
  if (!template || template.campaignId !== campaignId) {
    return NextResponse.json({ ok: false, error: `Unknown template id: ${templateId}` }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId as number },
    select: { email2DelayDays: true, email3DelayDays: true },
  });
  const delays = campaign ?? DEFAULT_DELAYS;

  const results: { prospectId: number; ok: boolean; error?: string }[] = [];

  let dispatched = 0;
  for (const prospectId of Array.from(new Set(prospectIds))) {
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        messages: {
          select: { step: true, sentAt: true, createdAt: true, events: { select: { type: true, occurredAt: true } } },
        },
      },
    });
    if (!prospect) {
      results.push({ prospectId, ok: false, error: "Prospect not found." });
      continue;
    }
    if (prospect.campaignId !== campaignId) {
      results.push({ prospectId, ok: false, error: "Prospect belongs to a different campaign." });
      continue;
    }

    // Enforce the sequence server-side, not just by what the dashboard lets
    // you tick: right order (Email 2 only after Email 1 went out), never the
    // same email twice, and nothing further to a contact who replied or
    // bounced. See lib/outreach/sequence.ts.
    // Delivery proof (any open/click, even an automated scan) and replies or
    // bounces come from the event history, not the status label, so neither
    // a lost confirmation nor a "Reset to Pending" can open the door to a
    // duplicate.
    const sequenceInput = {
      status: prospect.status as ProspectStatusName,
      messages: prospect.messages.map((m) => ({
        step: m.step,
        sentAt: m.sentAt,
        createdAt: m.createdAt,
        deliveredAt: deliveredAtFromEvents(m.events),
      })),
      stopSignal: stopSignalFromEvents(prospect.messages.flatMap((m) => m.events)),
    };
    const sendable = checkSendable(sequenceInput, step, delays);
    if (!sendable.ok) {
      results.push({ prospectId, ok: false, error: sendable.reason });
      continue;
    }
    if (computeSequence(sequenceInput, delays).steps[step - 1]?.unconfirmed && !confirmUnverified) {
      results.push({
        prospectId,
        ok: false,
        error: `An earlier Email ${step} request was never confirmed -- check Sent Items, then confirm the resend.`,
      });
      continue;
    }

    if (dispatched > 0) await sleep(PAUSE_BETWEEN_SENDS_MS);
    dispatched++;

    const token = generateTrackingToken();
    const trackingMarkup = {
      TRACKING_PIXEL: `<img src="${trackingPixelUrl(token)}" width="1" height="1" alt="" style="display:none;" />`,
      BOOKING_LINK: `<a href="${trackingClickUrl(token)}">book a meeting with DDN here</a>`,
    };

    // Two merges of the same prospect data, deliberately with different
    // escaping: the subject is a plain-text mail header (escaping would
    // show literal "&#39;" for a name like O'Brien), while the HTML body
    // needs its merge fields HTML-escaped so a name containing "<" or "&"
    // can't break the markup.
    const subject = mergeTemplateText(subjectSource, {
      FIRST_NAME: prospect.firstName,
      LAST_NAME: prospect.lastName ?? "",
      COMPANY: prospect.company ?? "",
      SENDER_NAME: senderName,
      ...trackingMarkup,
    });
    const html = mergeTemplateText(htmlSource, {
      FIRST_NAME: escapeHtml(prospect.firstName),
      LAST_NAME: escapeHtml(prospect.lastName ?? ""),
      COMPANY: escapeHtml(prospect.company ?? ""),
      SENDER_NAME: escapeHtml(senderName),
      ...trackingMarkup,
    });

    try {
      // Throws (and skips the DB writes below) if the request never reached
      // the relay inbox at all -- see dispatchSendRequest's docstring. A
      // prospect that fails here stays at whatever status it already had,
      // rather than being marked SENDING for a send that was never queued.
      await dispatchSendRequest({ token, toEmail: prospect.email, subject, html });

      await prisma.outreachMessage.create({
        data: {
          prospectId: prospect.id,
          step,
          mailbox,
          subject,
          trackingToken: token,
          sentAt: null,
        },
      });
      // Only moves a PENDING contact to SENDING (markStatus never downgrades),
      // so a follow-up to someone already SENT/OPENED/CLICKED leaves their
      // status alone; the per-email state comes from the message rows.
      await markStatus(prospect.id, "SENDING");

      results.push({ prospectId, ok: true });
    } catch (err) {
      results.push({ prospectId, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, results }, { headers: { "Cache-Control": "no-store" } });
}
