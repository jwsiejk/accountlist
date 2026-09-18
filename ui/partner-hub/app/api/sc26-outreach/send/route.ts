import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendTrackedMail } from "@/lib/sc26-outreach/graph";
import { generateTrackingToken } from "@/lib/sc26-outreach/tokens";
import { EMAIL_SUBJECT, renderOutreachEmail } from "@/lib/sc26-outreach/template";
import { trackingPixelUrl, trackingClickUrl } from "@/lib/sc26-outreach/urls";
import { markStatus } from "@/lib/sc26-outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SendBody {
  prospectIds: number[];
}

/**
 * Sends the SC26 outreach email to the given prospects one at a time via
 * Microsoft Graph. Intentionally sequential (not Promise.all) to stay well
 * under mailbox send-rate limits and to make partial failures easy to see
 * in the response.
 */
export async function POST(req: Request) {
  const mailbox = process.env.SC26_MAILBOX;
  const senderName = process.env.SC26_SENDER_NAME || mailbox || "DDN";
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
    const html = renderOutreachEmail({
      firstName: prospect.firstName,
      senderName,
      trackingPixelUrl: trackingPixelUrl(token),
      trackedBookingUrl: trackingClickUrl(token),
    });

    try {
      const sent = await sendTrackedMail({
        mailbox,
        toEmail: prospect.email,
        toName: [prospect.firstName, prospect.lastName].filter(Boolean).join(" "),
        subject: EMAIL_SUBJECT,
        html,
      });

      await prisma.outreachMessage.create({
        data: {
          prospectId: prospect.id,
          mailbox,
          subject: EMAIL_SUBJECT,
          trackingToken: token,
          graphMessageId: sent.graphMessageId,
          graphConversationId: sent.graphConversationId,
          sentAt: new Date(),
        },
      });
      await markStatus(prospect.id, "SENT");

      results.push({ prospectId, ok: true });
    } catch (err) {
      results.push({ prospectId, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, results }, { headers: { "Cache-Control": "no-store" } });
}
