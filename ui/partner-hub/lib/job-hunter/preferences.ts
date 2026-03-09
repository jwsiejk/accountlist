import type { JobHunterPreferences, JobPosting } from "./types";

export const getDefaultPreferences = (): JobHunterPreferences => ({
  targetRoles: [],
  targetKeywords: [],
  targetLocations: [],
  remoteOnly: false,
  excludedCompanies: [],
  excludedTitles: [],
  minimumScore: 0,
});

export const normalizePreferences = (
  input: Partial<JobHunterPreferences> | undefined,
): JobHunterPreferences => {
  const cleanList = (value: unknown): string[] =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
      : [];

  const min =
    typeof input?.minimumScore === "number" && Number.isFinite(input.minimumScore)
      ? Math.max(0, Math.min(100, input.minimumScore))
      : 0;

  return {
    targetRoles: cleanList(input?.targetRoles),
    targetKeywords: cleanList(input?.targetKeywords),
    targetLocations: cleanList(input?.targetLocations),
    remoteOnly: Boolean(input?.remoteOnly),
    excludedCompanies: cleanList(input?.excludedCompanies),
    excludedTitles: cleanList(input?.excludedTitles),
    minimumScore: min,
  };
};

const includesAny = (value: string | undefined, terms: string[]) => {
  const haystack = (value ?? "").toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
};

export const jobMatchesPreferences = (
  job: JobPosting,
  preferences: JobHunterPreferences,
): { excluded: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  if (includesAny(job.company, preferences.excludedCompanies)) {
    reasons.push("Excluded company");
  }

  if (includesAny(job.title, preferences.excludedTitles)) {
    reasons.push("Excluded title");
  }

  if (preferences.remoteOnly && !job.isRemote) {
    reasons.push("Remote-only preference");
  }

  return {
    excluded: reasons.length > 0,
    reasons,
  };
};
