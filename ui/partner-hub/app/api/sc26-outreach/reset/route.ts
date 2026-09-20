import { NextResponse } from "next/server";

import { resetProspectsToPending } from "@/lib/sc26-outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ResetBody {
  prospectIds: number[];
}

/**
 * Manual "unstick" action for the dashboard -- resets the given prospects
 * back to PENDING so they're selectable for a new send again. Exists
 * because a failed/misconfigured send (wrong relay config, a bounced
 * trigger email, etc.) otherwise leaves a prospect stuck at SENDING
 * forever with no in-app way to retry it; see resetProspectsToPending's
 * docstring for why this is a separate, rank-bypassing operation from
 * markStatus.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ResetBody | null;
  const prospectIds = body?.prospectIds;

  if (!Array.isArray(prospectIds) || prospectIds.length === 0 || !prospectIds.every((id) => Number.isInteger(id))) {
    return NextResponse.json({ ok: false, error: "prospectIds must be a non-empty array of integers." }, { status: 400 });
  }

  const count = await resetProspectsToPending(prospectIds);
  return NextResponse.json({ ok: true, count }, { headers: { "Cache-Control": "no-store" } });
}
