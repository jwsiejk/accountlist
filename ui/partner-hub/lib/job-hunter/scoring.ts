import { JOB_FIT_KEYWORDS } from "./keywordConfig";
import { classifyWorkArrangement, getDefaultPreferences } from "./preferences";
import type { JobHunterPreferences, JobPosting } from "./types";

export type KeywordMatch = {
  keyword: string;
  weight: number;
  matchedTerm?: string;
};

export type JobFitScore = {
  score: number;
  matched: KeywordMatch[];
  missing: KeywordMatch[];
  preferenceSignals: string[];
};

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");

const buildSearchableText = (job: JobPosting) => {
  return normalizeText(
    [job.title, job.company, job.department, job.location, job.notes, job.employmentType, job.salaryRange]
      .filter((part): part is string => Boolean(part))
      .join(" "),
  );
};

const includesAny = (value: string | undefined, terms: string[]) => {
  const haystack = normalizeText(value ?? "");
  return terms.find((term) => haystack.includes(normalizeText(term)));
};

export const scoreJobFit = (job: JobPosting, preferences?: JobHunterPreferences): JobFitScore => {
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

  let score = Math.round((matchedWeight / Math.max(totalWeight, 1)) * 100);
  const appliedPreferences = preferences ?? getDefaultPreferences();
  const preferenceSignals: string[] = [];
  const arrangement = classifyWorkArrangement(job);

  const matchedRole = includesAny(job.title, appliedPreferences.targetRoles);
  if (matchedRole) {
    score += 12;
    preferenceSignals.push(`Matched target role: ${matchedRole.toLowerCase()}`);
  }

  const matchedKeyword = appliedPreferences.targetKeywords.find((keyword) => searchableText.includes(normalizeText(keyword)));
  if (matchedKeyword) {
    score += 8;
    preferenceSignals.push(`Matched target keyword: ${matchedKeyword.toLowerCase()}`);
  }

  const matchedHybridLocation = includesAny(job.location, appliedPreferences.preferredHybridLocations);
  if (matchedHybridLocation && arrangement === "hybrid") {
    score += 6;
    preferenceSignals.push(`Matched hybrid location: ${matchedHybridLocation.toLowerCase()}`);
  }

  const matchedRemoteRegion = includesAny(job.location ?? job.notes, appliedPreferences.preferredRemoteRegions);
  if (matchedRemoteRegion && arrangement === "remote") {
    score += 6;
    preferenceSignals.push(`Matched remote region: ${matchedRemoteRegion.toLowerCase()}`);
  }

  if (arrangement === "unknown") {
    score -= 4;
    preferenceSignals.push("Work arrangement unknown");
  }

  if (arrangement === "onsite" && !appliedPreferences.allowOnsiteRoles) {
    score -= 20;
    preferenceSignals.push("Onsite preference unmet");
  }

  if (includesAny(job.company, appliedPreferences.excludedCompanies)) {
    score = 0;
    preferenceSignals.push("Excluded company match");
  }

  if (includesAny(job.title, appliedPreferences.excludedTitles)) {
    score = 0;
    preferenceSignals.push("Excluded title match");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    matched: matched.sort((a, b) => b.weight - a.weight).slice(0, 5),
    missing: missing.sort((a, b) => b.weight - a.weight).slice(0, 5),
    preferenceSignals,
  };
};
