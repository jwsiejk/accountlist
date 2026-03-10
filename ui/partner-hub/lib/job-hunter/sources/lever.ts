import { normalizeJobPosting } from "../normalize";
import type { JobPosting, JobSourceConfig } from "../types";

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  description?: string;
  descriptionPlain?: string;
  additional?: string;
  lists?: Array<{ text?: string; content?: string }>;
  workplaceType?: string;
  commitment?: string;
  salaryRange?: string;
  compensation?: string;
  createdAt?: number;
  categories?: {
    location?: string;
    team?: string;
    commitment?: string;
    workplaceType?: string;
  };
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

const parseSalary = (job: LeverJob) => {
  if (job.salaryRange) {
    return collapse(job.salaryRange);
  }

  if (job.compensation) {
    return collapse(job.compensation);
  }

  const content = [job.descriptionPlain, job.description, job.additional, ...((job.lists ?? []).map((item) => item.content ?? ""))]
    .map(plainText)
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const salaryMatch = content.match(/(\$\s?\d[\d,]*(?:\s?[-–to]+\s?\$?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr))?)/i);
  return salaryMatch ? collapse(salaryMatch[1]) : undefined;
};

const buildNotes = (job: LeverJob) => {
  const sections = [
    plainText(job.descriptionPlain),
    plainText(job.description),
    plainText(job.additional),
    ...((job.lists ?? []).map((entry) => `${entry.text ? `${collapse(entry.text)}: ` : ""}${plainText(entry.content) ?? ""}`.trim())),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const workplace = collapse(job.workplaceType ?? job.categories?.workplaceType ?? "");
  const commitment = collapse(job.commitment ?? job.categories?.commitment ?? "");
  const signals = [
    workplace ? `Workplace: ${workplace}` : undefined,
    commitment ? `Commitment: ${commitment}` : undefined,
  ].filter((part): part is string => Boolean(part));

  return [take(sections, 950), ...signals].filter((part): part is string => Boolean(part)).join(" ");
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
        salaryRange: parseSalary(job),
        employmentType: job.commitment ?? job.categories?.commitment,
        notes: buildNotes(job),
        url: job.hostedUrl,
        postedAt: typeof job.createdAt === "number" ? new Date(job.createdAt).toISOString() : undefined,
      }),
    );
}
