import { NextResponse } from "next/server";

import { createCampaign, listCampaigns } from "@/lib/outreach/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ ok: true, campaigns }, { headers: { "Cache-Control": "no-store" } });
}

interface CreateBody {
  name: string;
  description?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body?.name?.trim()) {
    return NextResponse.json({ ok: false, error: "Campaign name is required." }, { status: 400 });
  }
  try {
    const campaign = await createCampaign({ name: body.name, description: body.description });
    return NextResponse.json({ ok: true, campaign }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign.";
    // Prisma's unique-constraint error on Campaign.name -- surfaced as a
    // plain 409 rather than a generic 500 so the dashboard can show
    // "a campaign with that name already exists" instead of a stack trace.
    const isDuplicate = message.includes("Unique constraint");
    return NextResponse.json(
      { ok: false, error: isDuplicate ? "A campaign with that name already exists." : message },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
