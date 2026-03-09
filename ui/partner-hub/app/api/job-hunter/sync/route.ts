import { NextResponse } from "next/server";

import { runJobSync } from "@/lib/job-hunter/syncEngine";
import { loadJobHunterStore, setServerJobHunterStore } from "@/lib/job-hunter/storage";

export async function POST() {
  const jobs = await runJobSync();
  const store = loadJobHunterStore();
  const nextStore = {
    ...store,
    jobs,
    jobsById: Object.fromEntries(jobs.map((job) => [job.id, job])),
    lastSyncedAt: new Date().toISOString(),
  };

  setServerJobHunterStore(nextStore);

  return NextResponse.json({
    jobs: nextStore.jobs,
    jobsById: nextStore.jobsById,
    lastSyncedAt: nextStore.lastSyncedAt,
  });
}
