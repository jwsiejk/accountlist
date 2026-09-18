import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { dispatchSendRequest } from "@/lib/sc26-outreach/relay-send";
import { generateTrackingToken } from "@/lib/sc26-outreach/tokens";
import { EMAIL_SUBJECT } from "@/lib/sc26-outreach/template";
import { trackingPixelUrl, trackingClickUrl } from "@/lib/sc26-outreach/urls";
import { markStatus } from "@/lib/sc26-outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SendBody {
  prospectIds: number[];
}

/**
 * Requests the SC26 outreach send for the given prospects, one at a time via
 * the Gmail-relay-based Power Automate send-flow (see relay-send.ts).
 * Intentionally sequential (not Promise.all), same reasoning as the old
 * Graph version: stays well under mailbox send-rate limits and keeps partial
 * failures easy to read out of the response.
 *
 * This does NOT confirm the email actually went out from jsiejk@ddn.com --
 * it only confirms the send *request* reached the relay inbox. A prospect
 * lands in SENDING here and only advances to SENT once the send-flow's
 * confirmation notification comes back through the IMAP poller and calls
 * confirmMessageSent() (see imap-poller.ts). The template itself is no
 * longer rendered here at all: Power Automate holds its own copy of the
 * approved HTML and just substitutes FIRST_NAME/PIXEL_URL/CLICK_URL (see
 * relay-send.ts's docstring and the send-flow spec).
 */
export async function POST(req: Request) {
  const mailbox = process.env.SC26_MAILBOX;
  if (!mailbox) {
    return NextResponse.json({ ok: false, error: "SC26_MAILBOX is not configured." }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as SendBody | null;
  const prospectIds = body?.prospectIds;
  if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
    return NextResponse.json({ ok: false, error: "No prospects selected." }, { status: 400 });
  }

  const results: { prospectId: number; ok: boolean; error?: string }[] = [];

  for (const prospectId of prospectIds) {
    const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
    if (!prospect) {
      results.push({ prospectId, ok: false, error: "Prospect not found." });
      continue;
    }

    const token = generateTrackingToken();
    const pixelUrl = trackingPixelUrl(token);
    const clickUrl = trackingClickUrl(token);

    try {
      // Throws (and skips the DB writes below) if the request never reached
      // the relay inbox at all -- see dispatchSendRequest's docstring. A
      // prospect that fails here stays at whatever status it already had,
      // rather than being marked SENDING for a send that was never queued.
      await dispatchSendRequest({
        token,
        toEmail: prospect.email,
        firstName: prospect.firstName,
        pixelUrl,
        clickUrl,
      });

      await prisma.outreachMessage.create({
        data: {
          prospectId: prospect.id,
          mailbox,
          subject: EMAIL_SUBJECT,
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
