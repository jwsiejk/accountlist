import type { JobHunterPreferences, JobPosting, JobWorkArrangement } from "./types";

const REMOTE_KEYWORDS = ["remote", "work from home", "wfh", "distributed"];
const HYBRID_KEYWORDS = ["hybrid", "split schedule", "flexible office"];
const ONSITE_KEYWORDS = ["on-site", "onsite", "in office", "office-based", "office based", "on site"];

export const JAMES_DEFAULT_TARGET_ROLES = [
  "Solutions Architect",
  "Senior Solutions Architect",
  "Partner Solutions Architect",
  "Partner Solution Architect",
  "Solutions Engineer",
  "Sales Engineer",
  "Partner Technical Manager",
  "Technical Account Manager",
  "Customer Success Engineer",
  "Post-Sales Engineer",
  "Implementation Manager",
  "Senior Implementation Manager",
];

export const JAMES_DEFAULT_TARGET_KEYWORDS = [
  "solutions architect",
  "solutions engineering",
  "sales engineering",
  "partner",
  "channel",
  "alliances",
  "post-sales",
  "customer success",
  "implementation",
  "enablement",
  "workshop",
  "technical account management",
  "enterprise",
  "infrastructure",
  "storage",
  "vmware",
  "virtualization",
  "cloud",
  "hybrid cloud",
  "datacenter",
  "migration",
  "adoption",
];

export const JAMES_DEFAULT_HYBRID_LOCATIONS = [
  "Philadelphia, PA",
  "Greater Philadelphia",
  "Philadelphia Metro",
  "King of Prussia, PA",
  "Wayne, PA",
  "Radnor, PA",
  "Conshohocken, PA",
  "Malvern, PA",
  "Plymouth Meeting, PA",
  "Blue Bell, PA",
  "Fort Washington, PA",
  "Exton, PA",
  "Cherry Hill, NJ",
];

export const JAMES_DEFAULT_REMOTE_REGIONS = ["United States", "U.S.", "US", "Remote"];

export const getDefaultPreferences = (): JobHunterPreferences => ({
  targetRoles: [...JAMES_DEFAULT_TARGET_ROLES],
  targetKeywords: [...JAMES_DEFAULT_TARGET_KEYWORDS],
  targetLocations: [...JAMES_DEFAULT_HYBRID_LOCATIONS],
  preferredHybridLocations: [...JAMES_DEFAULT_HYBRID_LOCATIONS],
  preferredRemoteRegions: [...JAMES_DEFAULT_REMOTE_REGIONS],
  allowRemoteRoles: true,
  allowHybridRoles: true,
  allowOnsiteRoles: false,
  remoteOnly: false,
  excludedCompanies: [],
  excludedTitles: [],
  minimumScore: 0,
});

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s.-]/g, " ");

const includesTerm = (value: string | undefined, terms: string[]) => {
  const haystack = normalizeText(value ?? "");
  return terms.some((term) => haystack.includes(normalizeText(term)));
};

const cleanList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

const toBooleanOr = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

export const normalizePreferences = (
  input: Partial<JobHunterPreferences> | undefined,
): JobHunterPreferences => {
  const min =
    typeof input?.minimumScore === "number" && Number.isFinite(input.minimumScore)
      ? Math.max(0, Math.min(100, input.minimumScore))
      : 0;

  const targetLocations = cleanList(input?.targetLocations);
  const preferredHybridLocations = cleanList(input?.preferredHybridLocations);
  const preferredRemoteRegions = cleanList(input?.preferredRemoteRegions);
  const remoteOnly = Boolean(input?.remoteOnly);

  const allowRemoteRoles = toBooleanOr(input?.allowRemoteRoles, true);
  const allowHybridRoles = toBooleanOr(input?.allowHybridRoles, remoteOnly ? false : true);
  const allowOnsiteRoles = toBooleanOr(input?.allowOnsiteRoles, false);

  return {
    targetRoles: cleanList(input?.targetRoles),
    targetKeywords: cleanList(input?.targetKeywords),
    targetLocations,
    preferredHybridLocations: preferredHybridLocations.length > 0 ? preferredHybridLocations : targetLocations,
    preferredRemoteRegions,
    allowRemoteRoles,
    allowHybridRoles,
    allowOnsiteRoles,
    remoteOnly,
    excludedCompanies: cleanList(input?.excludedCompanies),
    excludedTitles: cleanList(input?.excludedTitles),
    minimumScore: min,
  };
};

const includesAny = (value: string | undefined, terms: string[]) => {
  const haystack = (value ?? "").toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
};

const matchesLocationPreference = (value: string | undefined, terms: string[]) => {
  if (terms.length === 0) {
    return true;
  }

  return includesAny(value, terms);
};

export const buildArrangementPreferenceText = (job: JobPosting) =>
  [job.location, job.notes, job.employmentType, job.title].filter(Boolean).join(" ");

export const classifyWorkArrangement = (job: JobPosting): JobWorkArrangement => {
  const combinedText = buildArrangementPreferenceText(job);

  if (includesTerm(combinedText, HYBRID_KEYWORDS)) {
    return "hybrid";
  }

  if (includesTerm(combinedText, REMOTE_KEYWORDS) || Boolean(job.isRemote)) {
    return "remote";
  }

  if (includesTerm(combinedText, ONSITE_KEYWORDS)) {
    return "onsite";
  }

  return "unknown";
};

export const jobMatchesPreferences = (
  job: JobPosting,
  preferences: JobHunterPreferences,
): { excluded: boolean; reasons: string[]; arrangement: JobWorkArrangement } => {
  const reasons: string[] = [];
  const arrangement = classifyWorkArrangement(job);
  const arrangementText = buildArrangementPreferenceText(job);

  if (includesAny(job.company, preferences.excludedCompanies)) {
    reasons.push("Excluded company");
  }

  if (includesAny(job.title, preferences.excludedTitles)) {
    reasons.push("Excluded title");
  }

  if (arrangement === "remote") {
    if (!preferences.allowRemoteRoles) {
      reasons.push("Remote roles disabled");
    } else if (!matchesLocationPreference(arrangementText, preferences.preferredRemoteRegions)) {
      reasons.push("Remote region not preferred");
    }
  }

  if (arrangement === "hybrid") {
    if (!preferences.allowHybridRoles) {
      reasons.push("Hybrid roles disabled");
    } else if (!matchesLocationPreference(arrangementText, preferences.preferredHybridLocations)) {
      reasons.push("Hybrid location not preferred");
    }
  }

  if (arrangement === "onsite" && !preferences.allowOnsiteRoles) {
    reasons.push("Onsite roles disabled");
  }

  return {
    excluded: reasons.length > 0,
    reasons,
    arrangement,
  };
};
