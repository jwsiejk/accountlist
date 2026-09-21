import { NextResponse } from "next/server";

import { findMessageByToken, logEvent, markStatus } from "@/lib/sc26-outreach/prospects";
import { classifyTrackingEvent } from "@/lib/sc26-outreach/eventClassification";
import { verifyTrackingToken } from "@/lib/sc26-outreach/tokens";

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
      const { automated, reason } = classifyTrackingEvent({
        dispatchedAt: message.createdAt,
        occurredAt,
        userAgent: ua,
      });
      // Same automated-vs-real split as the click route: always logged for
      // history, only a non-automated open advances status.
      await logEvent(message.id, "OPEN", { userAgent: ua, automated, reason, occurredAt });
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
