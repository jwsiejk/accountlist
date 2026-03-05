import { NextResponse } from "next/server";

import { fetchJobsForSource } from "@/lib/job-hunter/sources";
import type { JobPosting, JobSourceConfig } from "@/lib/job-hunter/types";

type SyncPayload = {
  sources?: JobSourceConfig[];
};

const isValidSource = (value: unknown): value is JobSourceConfig => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const source = value as Partial<JobSourceConfig>;
  return (
    typeof source.company === "string" &&
    source.company.trim().length > 0 &&
    (source.boardType === "greenhouse" || source.boardType === "lever") &&
    typeof source.boardToken === "string" &&
    source.boardToken.trim().length > 0
  );
};

export async function POST(req: Request) {
  const payload = (await req.json()) as SyncPayload;
  const sources = Array.isArray(payload.sources) ? payload.sources.filter(isValidSource) : [];

  if (sources.length === 0) {
    return NextResponse.json({ error: "Provide at least one valid source." }, { status: 400 });
  }

  const merged = new Map<string, JobPosting>();
  const errors: Array<{ source: JobSourceConfig; message: string }> = [];

  await Promise.all(
    sources.map(async (source) => {
      try {
        const jobs = await fetchJobsForSource(source);
        jobs.forEach((job) => {
          merged.set(job.id, job);
        });
      } catch (error) {
        errors.push({
          source,
          message: error instanceof Error ? error.message : "Unexpected source sync failure",
        });
      }
    })
  );

  const jobs = Array.from(merged.values()).sort((a, b) => {
    const aDate = a.postedAt ?? a.updatedAt;
    const bDate = b.postedAt ?? b.updatedAt;
    return bDate.localeCompare(aDate);
  });

  return NextResponse.json({
    jobs,
    jobsById: Object.fromEntries(jobs.map((job) => [job.id, job])),
    lastSyncedAt: new Date().toISOString(),
    errors,
  });
}
