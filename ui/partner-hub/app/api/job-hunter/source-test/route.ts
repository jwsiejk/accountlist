import { NextResponse } from "next/server";

import { testJobSource } from "@/lib/job-hunter/sourceTesting";
import { isValidJobSourceConfig } from "@/lib/job-hunter/storage";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { source?: unknown } | null;

  if (!isValidJobSourceConfig(payload?.source)) {
    return NextResponse.json({ error: "Invalid source payload." }, { status: 400 });
  }

  const source = {
    company: payload.source.company.trim(),
    boardType: payload.source.boardType,
    boardToken: payload.source.boardToken.trim(),
  };

  const result = await testJobSource(source);
  return NextResponse.json({ result });
}
