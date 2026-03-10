import { buildCleanPostingSummary, cleanInlineSourceText } from "../textCleanup";
import { normalizeJobPosting } from "../normalize";
import type { JobPosting, JobSourceConfig } from "../types";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  metadata?: Array<{ name?: string; value?: string }>;
  updated_at?: string;
};

type GreenhouseResponse = {
  jobs?: GreenhouseJob[];
};

const collapse = (value: string) => value.trim().replace(/\s+/g, " ");

const findMetadataValue = (metadata: GreenhouseJob["metadata"], match: RegExp) => {
  const entry = metadata?.find((item) => match.test(item.name ?? ""));
  return entry?.value ? cleanInlineSourceText(entry.value, 160) : undefined;
};

const getSalaryRange = (job: GreenhouseJob) => {
  const metadataComp = findMetadataValue(job.metadata, /(salary|compensation|pay range|base pay)/i);
  if (metadataComp) {
    return metadataComp;
  }

  const contentText = cleanInlineSourceText(job.content);
  if (!contentText) {
    return undefined;
  }

  const salaryMatch = contentText.match(/(\$\s?\d[\d,]*(?:\s?[-–to]+\s?\$?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr))?)/i);
  return salaryMatch ? collapse(salaryMatch[1]) : undefined;
};

const buildNotes = (job: GreenhouseJob) => {
  const employment = findMetadataValue(job.metadata, /employment type|job type/i);
  const seniority = findMetadataValue(job.metadata, /(experience|seniority)/i);
  const hiringNotes = findMetadataValue(job.metadata, /(travel|visa|clearance)/i);

  return buildCleanPostingSummary(
    [
      job.content,
      employment ? `Employment type: ${employment}` : undefined,
      seniority ? `Level: ${seniority}` : undefined,
      hiringNotes ? `Hiring notes: ${hiringNotes}` : undefined,
    ],
    { maxLength: 950 },
  );
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
    .map((job) => {
      const employmentType = findMetadataValue(job.metadata, /employment type|job type/i);
      return normalizeJobPosting({
        source: "greenhouse",
        externalId: job.id,
        company: source.company,
        title: job.title,
        location: job.location?.name,
        department: job.departments?.[0]?.name,
        salaryRange: getSalaryRange(job),
        employmentType,
        notes: buildNotes(job),
        url: job.absolute_url,
        postedAt: job.updated_at,
      });
    });
}
