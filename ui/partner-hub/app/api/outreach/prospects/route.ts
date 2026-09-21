import { NextResponse } from "next/server";

import { listProspects } from "@/lib/outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const campaignId = Number(new URL(req.url).searchParams.get("campaignId"));
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ ok: false, error: "campaignId query param is required." }, { status: 400 });
  }

  const prospects = await listProspects(campaignId);

  const shaped = prospects.map((p) => {
    const lastMessage = p.messages[0] ?? null;
    return {
      id: p.id,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      company: p.company,
      title: p.title,
      status: p.status,
      lastSentAt: lastMessage?.sentAt ?? null,
      eventCounts: (lastMessage?.events ?? []).reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] ?? 0) + 1;
        return acc;
      }, {}),
    };
  });

  return NextResponse.json({ ok: true, prospects: shaped }, { headers: { "Cache-Control": "no-store" } });
}
