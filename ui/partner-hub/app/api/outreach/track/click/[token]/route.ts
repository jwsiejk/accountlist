import { NextResponse } from "next/server";

import { findMessageByToken, logEvent, markStatus, recentCrossRecipientEvents, recentTrackingEvents } from "@/lib/outreach/prospects";
import { classifyTrackingEvent, clientIp, DETECTION_WINDOW_MS, emailDomain } from "@/lib/outreach/eventClassification";
import { verifyTrackingToken } from "@/lib/outreach/tokens";
import { bookingDestinationUrl } from "@/lib/outreach/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const destination = bookingDestinationUrl();

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
      // Always logged, regardless of the automated verdict -- this is the
      // permanent history. Only a non-automated click is allowed to move
      // the prospect's status, so a Safe Links-style prefetch doesn't get
      // reported to a rep as real recipient engagement.
      await logEvent(message.id, "CLICK", { userAgent: ua, ip, automated, reason, occurredAt });
      if (!automated) {
        await markStatus(message.prospectId, "CLICKED");
      }
    }
  }

  // Redirect regardless of token validity -- the recipient should always
  // land on the real booking page, tracking is best-effort on top of that.
  return NextResponse.redirect(destination, { status: 302 });
}
