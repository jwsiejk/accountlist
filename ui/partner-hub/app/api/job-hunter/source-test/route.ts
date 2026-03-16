import { NextResponse } from "next/server";

import { testJobSource } from "@/lib/job-hunter/sourceTesting";
import { isValidJobSourceConfig } from "@/lib/job-hunter/storage";
import { getSourceTestStatus } from "@/lib/job-hunter/sourceTestApi";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { source?: unknown } | null;

  if (!isValidJobSourceConfig(payload?.source)) {
    const response = {
      success: false,
      error: "Invalid source payload.",
    };

    return NextResponse.json(response, { status: getSourceTestStatus(response) });
  }

  const source = {
    company: payload.source.company.trim(),
    boardType: payload.source.boardType,
    boardToken: payload.source.boardToken.trim(),
  };

  const result = await testJobSource(source);

  const response = {
    success: result.success,
    result,
  };

  return NextResponse.json(response, { status: getSourceTestStatus(response) });
}
