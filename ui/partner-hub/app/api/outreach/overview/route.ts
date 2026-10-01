import { NextResponse } from "next/server";

import { getCampaignOverview } from "@/lib/outreach/overview";
import { getPollScheduler } from "@/lib/outreach/pollKick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything the Prospects and Report tabs show for one campaign: batches,
 * the contacts in each with per-email sequence progress, and roll-ups.
 */
export async function GET(req: Request) {
  const campaignId = Number(new URL(req.url).searchParams.get("campaignId"));
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ ok: false, error: "campaignId query param is required." }, { status: 400 });
  }
  try {
    const overview = await getCampaignOverview(campaignId);
    if (!overview) return NextResponse.json({ ok: false, error: "Campaign not found." }, { status: 404 });

    // Sends are only confirmed when the relay mailbox is polled. If anything
    // is waiting on a confirmation, poll in the background now (throttled,
    // single-flight) instead of waiting for the slow scheduled poll. The next
    // dashboard refresh picks up the result.
    const waiting = overview.batches.some((b) =>
      b.contacts.some((c) => c.sequence.steps.some((s) => s.state === "queued" || s.unconfirmed))
    );
    if (waiting) getPollScheduler().kick();

    return NextResponse.json({ ok: true, ...overview }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("outreach overview failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load campaign." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
