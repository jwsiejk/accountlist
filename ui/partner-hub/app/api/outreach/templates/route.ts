import { NextResponse } from "next/server";

import { createTemplate, listTemplates } from "@/lib/outreach/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Templates are DB-backed and scoped to a campaign -- see
 * lib/outreach/templates.ts for why (this used to be a file-based library
 * requiring a code change + redeploy to edit copy).
 */
export async function GET(req: Request) {
  const campaignId = Number(new URL(req.url).searchParams.get("campaignId"));
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ ok: false, error: "campaignId query param is required." }, { status: 400 });
  }
  const templates = await listTemplates(campaignId);
  return NextResponse.json({ ok: true, templates }, { headers: { "Cache-Control": "no-store" } });
}

interface CreateBody {
  campaignId: number;
  name: string;
  subject: string;
  html: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body || !Number.isInteger(body.campaignId)) {
    return NextResponse.json({ ok: false, error: "campaignId is required." }, { status: 400 });
  }
  try {
    const template = await createTemplate({
      campaignId: body.campaignId,
      name: body.name ?? "",
      subject: body.subject ?? "",
      html: body.html ?? "",
    });
    return NextResponse.json({ ok: true, template }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to create template." },
      { status: 400 }
    );
  }
}
