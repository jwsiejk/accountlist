import { normalizeJobPosting } from "@/lib/job-hunter/normalize";
import type { JobPosting, JobSourceConfig } from "@/lib/job-hunter/types";

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  categories?: {
    location?: string;
    team?: string;
  };
};

export async function fetchLeverJobs(source: JobSourceConfig): Promise<JobPosting[]> {
  const endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(source.boardToken)}?mode=json`;
  const res = await fetch(endpoint, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Lever fetch failed (${res.status})`);
  }

  const jobs = (await res.json()) as LeverJob[];

  return jobs
    .filter((job) => !!job.id && !!job.text && !!job.hostedUrl)
    .map((job) =>
      normalizeJobPosting({
        source: "lever",
        externalId: job.id,
        company: source.company,
        title: job.text,
        location: job.categories?.location,
        department: job.categories?.team,
        url: job.hostedUrl,
        postedAt: typeof job.createdAt === "number" ? new Date(job.createdAt).toISOString() : undefined,
      })
    );
}
