import { NextResponse } from "next/server";

import { discoverOllamaModels } from "@/lib/ai-factory-economics/ollama";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await discoverOllamaModels();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
