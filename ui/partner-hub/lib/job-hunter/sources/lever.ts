import { buildCleanPostingSummary, cleanInlineSourceText } from "../textCleanup";
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

const parseSalary = (job: LeverJob) => {
  if (job.salaryRange) {
    return cleanInlineSourceText(job.salaryRange, 120);
  }

  if (job.compensation) {
    return cleanInlineSourceText(job.compensation, 120);
  }

  const content = [job.descriptionPlain, job.description, job.additional, ...((job.lists ?? []).map((item) => item.content ?? ""))]
    .map((part) => cleanInlineSourceText(part))
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const salaryMatch = content.match(/(\$\s?\d[\d,]*(?:\s?[-–to]+\s?\$?\d[\d,]*)?(?:\s*(?:per|\/)\s*(?:year|yr|hour|hr))?)/i);
  return salaryMatch ? collapse(salaryMatch[1]) : undefined;
};

const buildNotes = (job: LeverJob) => {
  const workplace = cleanInlineSourceText(job.workplaceType ?? job.categories?.workplaceType ?? "", 80);
  const commitment = cleanInlineSourceText(job.commitment ?? job.categories?.commitment ?? "", 80);

  return buildCleanPostingSummary(
    [
      job.descriptionPlain,
      job.description,
      job.additional,
      ...((job.lists ?? []).map((entry) => `${entry.text ? `${collapse(entry.text)}: ` : ""}${entry.content ?? ""}`.trim())),
      workplace ? `Workplace: ${workplace}` : undefined,
      commitment ? `Commitment: ${commitment}` : undefined,
    ],
    { maxLength: 950 },
  );
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
