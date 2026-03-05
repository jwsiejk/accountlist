import type { JobPosting, JobSourceConfig } from "@/lib/job-hunter/types";

import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";

export async function fetchJobsForSource(source: JobSourceConfig): Promise<JobPosting[]> {
  if (source.boardType === "greenhouse") {
    return fetchGreenhouseJobs(source);
  }

  if (source.boardType === "lever") {
    return fetchLeverJobs(source);
  }

  return [];
}
