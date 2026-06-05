import { NextResponse } from "next/server";

import { getOllamaHealth } from "@/lib/ai-factory-economics/ollama";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const health = await getOllamaHealth();

  return NextResponse.json(health, {
    status: health.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache",
    },
  });
}
