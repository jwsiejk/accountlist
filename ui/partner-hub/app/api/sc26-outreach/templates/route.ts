import { NextResponse } from "next/server";

import { TEMPLATES } from "@/lib/sc26-outreach/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lists the template library (lib/sc26-outreach/templates) for the
 * dashboard's template picker. Read-only and unauthenticated like the
 * other sc26-outreach data routes -- this module has no per-user auth of
 * its own yet (see the still-pending "add basic auth" task).
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, templates: TEMPLATES },
    { headers: { "Cache-Control": "no-store" } }
  );
}
