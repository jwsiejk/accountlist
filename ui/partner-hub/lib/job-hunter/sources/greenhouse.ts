import { normalizeJobPosting } from "../normalize";
import type { JobPosting, JobSourceConfig } from "../types";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  updated_at?: string;
};

type GreenhouseResponse = {
  jobs?: GreenhouseJob[];
};

export async function fetchGreenhouseJobs(source: JobSourceConfig): Promise<JobPosting[]> {
  const endpoint = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.boardToken)}/jobs?content=true`;
  const res = await fetch(endpoint, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Greenhouse fetch failed (${res.status})`);
  }

  const data = (await res.json()) as GreenhouseResponse;
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  return jobs
    .filter((job) => !!job.id && !!job.title && !!job.absolute_url)
    .map((job) =>
      normalizeJobPosting({
        source: "greenhouse",
        externalId: job.id,
        company: source.company,
        title: job.title,
        location: job.location?.name,
        department: job.departments?.[0]?.name,
        url: job.absolute_url,
        postedAt: job.updated_at,
      })
    );
}
