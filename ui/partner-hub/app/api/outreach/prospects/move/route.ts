import { NextResponse } from "next/server";

import { moveProspects } from "@/lib/outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MoveBody {
  campaignId: number;
  prospectIds: number[];
  /** Target batch id, or null to move them to "Unassigned". */
  batchId: number | null;
}

/**
 * Moves contacts between batches of one campaign. Only their batch changes --
 * email history and sequence progress stay attached to the contact.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as MoveBody | null;
  if (!body || !Number.isInteger(body.campaignId) || body.campaignId <= 0) {
    return NextResponse.json({ ok: false, error: "campaignId is required." }, { status: 400 });
  }
  if (!Array.isArray(body.prospectIds) || body.prospectIds.length === 0 || !body.prospectIds.every(Number.isInteger)) {
    return NextResponse.json({ ok: false, error: "prospectIds must be a non-empty array of integers." }, { status: 400 });
  }
  if (body.batchId !== null && !Number.isInteger(body.batchId)) {
    return NextResponse.json({ ok: false, error: "batchId must be an integer or null." }, { status: 400 });
  }

  try {
    const count = await moveProspects(body.campaignId, body.prospectIds, body.batchId);
    return NextResponse.json({ ok: true, count }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to move contacts." },
      { status: 400 }
    );
  }
}
