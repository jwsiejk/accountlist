import { NextResponse } from "next/server";

import { getPollScheduler } from "@/lib/outreach/pollKick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Runs one IMAP poll cycle against the Gmail relay mailbox (shared by every
 * campaign) and turns any newly matched send-confirmations/replies into
 * status updates + TrackingEvents. Meant to be hit on a recurring schedule
 * (see .github/workflows/outreach-imap-poll.yml) rather than relied on to
 * run by itself -- there is no in-process timer.
 *
 * Protected by CRON_SECRET so it can't be hit by anyone who finds the URL.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    // Shares a lock with the dashboard-triggered background poll so two polls
    // never process the same mailbox messages at once.
    const run = await getPollScheduler().runOnce();
    if (!run.ran) {
      return NextResponse.json({ ok: true, skipped: "a poll is already running" }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: true, result: run.result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
