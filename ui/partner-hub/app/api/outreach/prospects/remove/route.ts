import { NextResponse } from "next/server";

import { removeProspects } from "@/lib/outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RemoveBody {
  campaignId: number;
  prospectIds: number[];
}

/**
 * Removes contacts from the campaign for good (their messages and tracking
 * history go with them). They can be re-imported later and start fresh. The
 * dashboard confirms with the person before calling this.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RemoveBody | null;
  if (!body || !Number.isInteger(body.campaignId) || body.campaignId <= 0) {
    return NextResponse.json({ ok: false, error: "campaignId is required." }, { status: 400 });
  }
  if (!Array.isArray(body.prospectIds) || body.prospectIds.length === 0 || !body.prospectIds.every(Number.isInteger)) {
    return NextResponse.json({ ok: false, error: "prospectIds must be a non-empty array of integers." }, { status: 400 });
  }

  try {
    const count = await removeProspects(body.campaignId, body.prospectIds);
    return NextResponse.json({ ok: true, count }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to remove contacts." },
      { status: 500 }
    );
  }
}
