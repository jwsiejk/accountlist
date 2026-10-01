import { NextResponse } from "next/server";

import { getCampaignOverview } from "@/lib/outreach/overview";

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
    return NextResponse.json({ ok: true, ...overview }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("outreach overview failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load campaign." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
