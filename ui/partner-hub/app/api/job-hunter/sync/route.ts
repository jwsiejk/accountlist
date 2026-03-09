import { NextResponse } from "next/server";

import { validateJobSources } from "@/lib/job-hunter/storage";
import { runJobSync } from "@/lib/job-hunter/syncEngine";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { sources?: unknown } | null;
  const sources = validateJobSources(payload?.sources);

  if (!Array.isArray(payload?.sources) || sources.length !== payload.sources.length) {
    return NextResponse.json({ error: "Invalid sources payload." }, { status: 400 });
  }

  const jobs = await runJobSync(sources);
  const jobsById = Object.fromEntries(jobs.map((job) => [job.id, job]));
  const lastSyncedAt = new Date().toISOString();

  return NextResponse.json({
    jobs,
    jobsById,
    lastSyncedAt,
  });
}
