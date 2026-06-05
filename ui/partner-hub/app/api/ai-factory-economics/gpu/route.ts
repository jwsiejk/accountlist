import { NextResponse } from "next/server";

import { getNvidiaGpuTelemetry } from "@/lib/ai-factory-economics/gpu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await getNvidiaGpuTelemetry();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
