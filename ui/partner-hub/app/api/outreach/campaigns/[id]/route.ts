import { NextResponse } from "next/server";

import { deleteCampaign, updateCampaign } from "@/lib/outreach/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

interface UpdateBody {
  name: string;
  description?: string;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ ok: false, error: "Invalid campaign id." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as UpdateBody | null;
  if (!body?.name?.trim()) {
    return NextResponse.json({ ok: false, error: "Campaign name is required." }, { status: 400 });
  }

  try {
    const campaign = await updateCampaign(id, { name: body.name, description: body.description });
    return NextResponse.json({ ok: true, campaign }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update campaign.";
    const isDuplicate = message.includes("Unique constraint");
    return NextResponse.json(
      { ok: false, error: isDuplicate ? "A campaign with that name already exists." : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}

/**
 * Cascades to every prospect, template, message, and tracking event under
 * this campaign (schema-level onDelete: Cascade) -- irreversible. The
 * dashboard confirms with the person before calling this.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ ok: false, error: "Invalid campaign id." }, { status: 400 });

  try {
    await deleteCampaign(id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to delete campaign." },
      { status: 500 }
    );
  }
}
