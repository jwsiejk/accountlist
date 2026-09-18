import { NextResponse } from "next/server";

import { pollImapForReplies } from "@/lib/sc26-outreach/imap-poller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs one IMAP poll cycle against the Gmail relay mailbox and turns any
 * newly matched replies into TrackingEvents. Meant to be hit on a recurring
 * schedule (a Render Cron Job, or any external scheduler that can send an
 * authenticated POST) rather than relied on to run by itself -- there is no
 * in-process timer.
 *
 * Protected by CRON_SECRET, the same var graph/subscribe/route.ts already
 * uses for its own scheduled trigger, so it can't be hit by anyone who
 * finds the URL and so a single secret covers both once the Graph routes
 * are eventually removed.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await pollImapForReplies();
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
