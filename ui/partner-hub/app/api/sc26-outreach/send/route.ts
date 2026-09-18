import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { dispatchSendRequest } from "@/lib/sc26-outreach/relay-send";
import { generateTrackingToken } from "@/lib/sc26-outreach/tokens";
import { trackingPixelUrl, trackingClickUrl } from "@/lib/sc26-outreach/urls";
import { markStatus } from "@/lib/sc26-outreach/prospects";
import { escapeHtml, mergeTemplateText } from "@/lib/sc26-outreach/merge";
import { getTemplate } from "@/lib/sc26-outreach/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SendBody {
  prospectIds: number[];
  templateId: string;
  /** Subject as edited in the dashboard's review step (may differ from the template's default). */
  subject: string;
  /** HTML as edited in the dashboard's review step -- still has {{FIRST_NAME}} etc. unmerged. */
  html: string;
}

/**
 * Requests the SC26 outreach send for the given prospects, one at a time via
 * the Gmail-relay-based Power Automate send-flow (see relay-send.ts).
 * Intentionally sequential (not Promise.all), same reasoning as before:
 * stays well under mailbox send-rate limits and keeps partial failures easy
 * to read out of the response.
 *
 * Unlike the original version, the *content* is no longer fixed: `subject`
 * and `html` come from the request body -- whatever the dashboard's
 * template-picker + edit step produced -- not from a hardcoded template
 * import. templateId is only used to log which template a send started
 * from (OutreachMessage.subject already captures the final subject); it is
 * not re-fetched or validated against here, since the edited content is
 * what's authoritative for the actual send, exactly as reviewed on screen.
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
  const prospectIds = body?.prospectIds;
  const templateId = body?.templateId?.trim();
  const subjectSource = body?.subject?.trim();
  const htmlSource = body?.html;

  if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
    return NextResponse.json({ ok: false, error: "No prospects selected." }, { status: 400 });
  }
  if (!templateId) {
    return NextResponse.json({ ok: false, error: "No template selected." }, { status: 400 });
  }
  if (!subjectSource) {
    return NextResponse.json({ ok: false, error: "Subject is empty." }, { status: 400 });
  }
  if (!htmlSource || !htmlSource.trim()) {
    return NextResponse.json({ ok: false, error: "Email body is empty." }, { status: 400 });
  }
  // Referenced only to fail fast on a stale/unknown id from the client
  // (e.g. a template removed from the library since the page loaded) --
  // see the docstring above for why the fetched template itself isn't used.
  if (!getTemplate(templateId)) {
    return NextResponse.json({ ok: false, error: `Unknown template id: ${templateId}` }, { status: 400 });
  }

  const results: { prospectId: number; ok: boolean; error?: string }[] = [];

  for (const prospectId of prospectIds) {
    const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
    if (!prospect) {
      results.push({ prospectId, ok: false, error: "Prospect not found." });
      continue;
    }

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
          mailbox,
          subject,
          trackingToken: token,
          sentAt: null,
        },
      });
      await markStatus(prospect.id, "SENDING");

      results.push({ prospectId, ok: true });
    } catch (err) {
      results.push({ prospectId, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, results }, { headers: { "Cache-Control": "no-store" } });
}
