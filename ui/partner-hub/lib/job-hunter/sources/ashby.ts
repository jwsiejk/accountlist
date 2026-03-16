import { buildCleanPostingSummary, cleanInlineSourceText } from "../textCleanup";
import { normalizeJobPosting } from "../normalize";
import type { JobPosting, JobSourceConfig } from "../types";

type AshbyLocation = {
  locationName?: string;
};

type AshbyCompensationTier = {
  summary?: string;
};

type AshbyCompensation = {
  compensationTierSummary?: string;
  compensationTiers?: AshbyCompensationTier[];
};

type AshbyJob = {
  id?: string;
  title?: string;
  jobUrl?: string;
  location?: AshbyLocation;
  locationName?: string;
  departmentName?: string;
  employmentType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  createdAt?: string;
  postedDate?: string;
  compensation?: AshbyCompensation;
};

type AshbyResponse = {
  jobs?: AshbyJob[];
};

const parseSalary = (job: AshbyJob) => {
  if (job.compensation?.compensationTierSummary) {
    return cleanInlineSourceText(job.compensation.compensationTierSummary, 120);
  }

  const tierSummary = job.compensation?.compensationTiers?.map((tier) => cleanInlineSourceText(tier.summary, 120)).find(Boolean);
  if (tierSummary) {
    return tierSummary;
  }

  const content = cleanInlineSourceText(job.descriptionPlain ?? job.descriptionHtml);
  if (!content) {
    return undefined;
  }

  const match = content.match(/(\$\s?\d[\d,]*(?:\s?[-–to]+\s?\$?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr))?)/i);
  return match ? cleanInlineSourceText(match[1], 120) : undefined;
};

const buildNotes = (job: AshbyJob) =>
  buildCleanPostingSummary([job.descriptionPlain, job.descriptionHtml, job.employmentType ? `Employment type: ${job.employmentType}` : undefined], {
    maxLength: 950,
  });

export async function fetchAshbyJobs(source: JobSourceConfig): Promise<JobPosting[]> {
  const endpoint = "https://jobs.ashbyhq.com/api/non-user-portal/job-board";
  const res = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      organizationHostedJobsPageName: source.boardToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ashby fetch failed (${res.status})`);
  }

  const data = (await res.json()) as AshbyResponse;
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  return jobs
    .filter((job) => !!job.id && !!job.title && !!job.jobUrl)
    .map((job) =>
      normalizeJobPosting({
        source: "ashby",
        externalId: job.id!,
        company: source.company,
        title: job.title!,
        location: job.locationName ?? job.location?.locationName,
        department: job.departmentName,
        salaryRange: parseSalary(job),
        employmentType: job.employmentType,
        notes: buildNotes(job),
        url: job.jobUrl!,
        postedAt: job.postedDate ?? job.createdAt,
      }),
    );
}
