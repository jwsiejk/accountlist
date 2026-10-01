import { NextResponse } from "next/server";

import { BatchError, deleteBatch, renameBatch } from "@/lib/outreach/batches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ ok: false, error: "Invalid batch id." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  try {
    const batch = await renameBatch(id, body?.name ?? "");
    return NextResponse.json({ ok: true, batch }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const known = err instanceof BatchError;
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to rename batch." },
      { status: known ? 400 : 500 }
    );
  }
}

/**
 * Deletes the batch only -- its contacts are kept and show up as "Unassigned"
 * (see deleteBatch in lib/outreach/batches.ts).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ ok: false, error: "Invalid batch id." }, { status: 400 });

  try {
    await deleteBatch(id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to delete batch." },
      { status: 500 }
    );
  }
}
