import { JOB_FIT_KEYWORDS } from "./keywordConfig";
import type { JobPosting } from "./types";

export type KeywordMatch = {
  keyword: string;
  weight: number;
  matchedTerm?: string;
};

export type JobFitScore = {
  score: number;
  matched: KeywordMatch[];
  missing: KeywordMatch[];
};

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");

const buildSearchableText = (job: JobPosting) => {
  return normalizeText(
    [job.title, job.company, job.department, job.location, job.notes]
      .filter((part): part is string => Boolean(part))
      .join(" "),
  );
};

export const scoreJobFit = (job: JobPosting): JobFitScore => {
  const searchableText = buildSearchableText(job);
  const totalWeight = JOB_FIT_KEYWORDS.reduce((sum, item) => sum + item.weight, 0);

  let matchedWeight = 0;
  const matched: KeywordMatch[] = [];
  const missing: KeywordMatch[] = [];

  for (const item of JOB_FIT_KEYWORDS) {
    const terms = [item.keyword, ...(item.aliases ?? [])].map(normalizeText);
    const matchedTerm = terms.find((term) => searchableText.includes(term));

    if (matchedTerm) {
      matchedWeight += item.weight;
      matched.push({ keyword: item.keyword, weight: item.weight, matchedTerm });
    } else {
      missing.push({ keyword: item.keyword, weight: item.weight });
    }
  }

  const score = Math.round((matchedWeight / Math.max(totalWeight, 1)) * 100);

  return {
    score,
    matched: matched.sort((a, b) => b.weight - a.weight).slice(0, 5),
    missing: missing.sort((a, b) => b.weight - a.weight).slice(0, 5),
  };
};
