import type { JobPosting, JobSourceConfig } from "../types";

import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchAshbyJobs } from "./ashby";
import { fetchSmartRecruitersJobs } from "./smartrecruiters";

export async function fetchJobsForSource(source: JobSourceConfig): Promise<JobPosting[]> {
  if (source.boardType === "greenhouse") {
    return fetchGreenhouseJobs(source);
  }

  if (source.boardType === "lever") {
    return fetchLeverJobs(source);
  }

  if (source.boardType === "ashby") {
    return fetchAshbyJobs(source);
  }

  if (source.boardType === "smartrecruiters") {
    return fetchSmartRecruitersJobs(source);
  }

  return [];
}
