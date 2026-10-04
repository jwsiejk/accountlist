import { NextResponse } from "next/server";

import { findMessageByToken, logEvent, markStatus, recentCrossRecipientEvents, recentTrackingEvents } from "@/lib/outreach/prospects";
import { classifyTrackingEvent, clientIp, DETECTION_WINDOW_MS, emailDomain } from "@/lib/outreach/eventClassification";
import { verifyTrackingToken } from "@/lib/outreach/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1x1 transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64"
);

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (verifyTrackingToken(token)) {
    const message = await findMessageByToken(token);
    if (message) {
      const ua = req.headers.get("user-agent") ?? undefined;
      const occurredAt = new Date();
      const ip = clientIp(req.headers);
      const since = new Date(occurredAt.getTime() - DETECTION_WINDOW_MS);
      const [priorEvents, crossRecipientEvents] = await Promise.all([
        recentTrackingEvents(message.id, since),
        recentCrossRecipientEvents(since, message.id),
      ]);
      const { automated, reason } = classifyTrackingEvent({
        dispatchedAt: message.createdAt,
        confirmedSentAt: message.sentAt,
        occurredAt,
        userAgent: ua,
        ip,
        recipientDomain: emailDomain(message.prospect.email),
        priorEvents,
        crossRecipientEvents,
      });
      // Same automated-vs-real split as the click route: always logged for
      // history, only a non-automated open advances status.
      await logEvent(message.id, "OPEN", { userAgent: ua, ip, automated, reason, occurredAt });
      if (!automated) {
        await markStatus(message.prospectId, "OPENED");
      }
    }
  }

  // Always return the pixel, even for an unrecognized token -- never let a
  // tracking endpoint reveal whether a token is valid via its response.
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
