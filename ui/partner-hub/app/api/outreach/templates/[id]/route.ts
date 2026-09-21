import { NextResponse } from "next/server";

import { deleteTemplate, updateTemplate } from "@/lib/outreach/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

interface UpdateBody {
  name: string;
  subject: string;
  html: string;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ ok: false, error: "Invalid template id." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as UpdateBody | null;
  if (!body) return NextResponse.json({ ok: false, error: "Missing body." }, { status: 400 });

  try {
    const template = await updateTemplate(id, {
      name: body.name ?? "",
      subject: body.subject ?? "",
      html: body.html ?? "",
    });
    return NextResponse.json({ ok: true, template }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to update template." },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ ok: false, error: "Invalid template id." }, { status: 400 });

  try {
    await deleteTemplate(id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to delete template." },
      { status: 500 }
    );
  }
}
