import { NextResponse } from "next/server";

import { findMessageByToken, logEvent, markStatus, recentCrossRecipientEvents, recentTrackingEvents } from "@/lib/outreach/prospects";
import { classifyTrackingEvent, clientIp, DETECTION_WINDOW_MS, emailDomain } from "@/lib/outreach/eventClassification";
import { signTrackedLink, verifyTrackingToken } from "@/lib/outreach/tokens";
import { verifiedDestination } from "@/lib/outreach/linkTracking";
import { bookingDestinationUrl } from "@/lib/outreach/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // A tracked ordinary link carries its real destination (u) and a signature
  // (s) over (token, u); only a valid signature is honoured, so this can't be
  // used as an open redirect. Anything else -- including the {{BOOKING_LINK}}
  // anchor, which has neither -- goes to the booking page as before.
  const search = new URL(req.url).searchParams;
  const linkDestination = verifiedDestination(token, search.get("u"), search.get("s"), signTrackedLink);
  const destination = linkDestination ?? bookingDestinationUrl();

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
      await logEvent(message.id, "CLICK", {
        userAgent: ua,
        ip,
        automated,
        reason,
        occurredAt,
        url: destination,
        link: linkDestination ? "content" : "booking",
      });
      if (!automated) {
        await markStatus(message.prospectId, "CLICKED");
      }
    }
  }

  // Redirect regardless of token validity -- the recipient should always land
  // on the page they clicked; tracking is best-effort on top of that.
  return NextResponse.redirect(destination, { status: 302 });
}
