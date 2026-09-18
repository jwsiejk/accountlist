import { NextResponse } from "next/server";

import { findMessageByToken, logEvent, markStatus } from "@/lib/sc26-outreach/prospects";
import { verifyTrackingToken } from "@/lib/sc26-outreach/tokens";
import { bookingDestinationUrl } from "@/lib/sc26-outreach/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const destination = bookingDestinationUrl();

  if (verifyTrackingToken(token)) {
    const message = await findMessageByToken(token);
    if (message) {
      const ua = req.headers.get("user-agent") ?? undefined;
      await logEvent(message.id, "CLICK", { userAgent: ua });
      await markStatus(message.prospectId, "CLICKED");
    }
  }

  // Redirect regardless of token validity -- the recipient should always
  // land on the real booking page, tracking is best-effort on top of that.
  return NextResponse.redirect(destination, { status: 302 });
}
