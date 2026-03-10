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

const plainText = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
};

const take = (value: string | undefined, maxLength: number) => {
  if (!value) {
    return undefined;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const findMetadataValue = (metadata: GreenhouseJob["metadata"], match: RegExp) => {
  const entry = metadata?.find((item) => match.test(item.name ?? ""));
  return entry?.value ? collapse(entry.value) : undefined;
};

const getSalaryRange = (job: GreenhouseJob) => {
  const metadataComp = findMetadataValue(job.metadata, /(salary|compensation|pay range|base pay)/i);
  if (metadataComp) {
    return metadataComp;
  }

  const contentText = plainText(job.content);
  if (!contentText) {
    return undefined;
  }

  const salaryMatch = contentText.match(/(\$\s?\d[\d,]*(?:\s?[-–to]+\s?\$?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr))?)/i);
  return salaryMatch ? collapse(salaryMatch[1]) : undefined;
};

const buildNotes = (job: GreenhouseJob) => {
  const summary = take(plainText(job.content), 950);
  const highlights = [
    findMetadataValue(job.metadata, /employment type|job type/i) ? `Employment type: ${findMetadataValue(job.metadata, /employment type|job type/i)}` : undefined,
    findMetadataValue(job.metadata, /(experience|seniority)/i) ? `Level: ${findMetadataValue(job.metadata, /(experience|seniority)/i)}` : undefined,
    findMetadataValue(job.metadata, /(travel|visa|clearance)/i) ? `Hiring notes: ${findMetadataValue(job.metadata, /(travel|visa|clearance)/i)}` : undefined,
  ].filter((part): part is string => Boolean(part));

  return [summary, ...highlights].filter((part): part is string => Boolean(part)).join(" ");
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
