import { NextResponse } from "next/server";

import { BatchError, createBatch } from "@/lib/outreach/batches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  campaignId: number;
  /** Optional -- blank/missing auto-names it "Batch N". */
  name?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body || !Number.isInteger(body.campaignId) || body.campaignId <= 0) {
    return NextResponse.json({ ok: false, error: "campaignId is required." }, { status: 400 });
  }
  try {
    const batch = await createBatch(body.campaignId, body.name);
    return NextResponse.json({ ok: true, batch }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const known = err instanceof BatchError;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to create batch." },
      { status: known ? 400 : 500 }
    );
  }
}
