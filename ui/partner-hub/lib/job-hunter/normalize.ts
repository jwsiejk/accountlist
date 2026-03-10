import type { BoardType, JobPosting } from "./types";
import { cleanInlineSourceText } from "./textCleanup";

type NormalizeJobInput = {
  source: BoardType;
  externalId: string | number;
  company: string;
  title: string;
  location?: string;
  department?: string;
  salaryRange?: string;
  employmentType?: string;
  notes?: string;
  url: string;
  postedAt?: string;
};

const MAX_NOTES_LENGTH = 1200;

const collapse = (value: string) => value.trim().replace(/\s+/g, " ");

const sanitizeText = (value?: string, maxLength?: number) => {
  const cleaned = cleanInlineSourceText(value, maxLength);
  if (!cleaned) {
    return undefined;
  }
  return maxLength ? collapse(cleaned) : cleaned;
};

const normalizeLocation = (location?: string) => {
  if (!location) {
    return "Remote / TBD";
  }

  const compact = collapse(location);
  if (/remote/i.test(compact)) {
    return "Remote";
  }

  return compact;
};

const toIsoIfValid = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
};

const stableJobId = (source: BoardType, externalId: string | number) => {
  const normalizedExternal = String(externalId).trim().toLowerCase();
  return `${source}:${normalizedExternal}`;
};

export const normalizeJobPosting = (input: NormalizeJobInput): JobPosting => {
  const timestamp = new Date().toISOString();
  const id = stableJobId(input.source, input.externalId);
  const postedAt = toIsoIfValid(input.postedAt);

  return {
    id,
    externalId: String(input.externalId),
    title: collapse(input.title),
    company: collapse(input.company),
    location: normalizeLocation(input.location),
    department: input.department ? collapse(input.department) : undefined,
    salaryRange: sanitizeText(input.salaryRange, 120),
    employmentType: sanitizeText(input.employmentType, 80),
    sourceProvider: input.source,
    source: "company-site",
    sourceUrl: collapse(input.url),
    postedAt,
    isRemote: /remote/i.test(input.location ?? ""),
    notes: sanitizeText(input.notes, MAX_NOTES_LENGTH),
    createdAt: postedAt ?? timestamp,
    updatedAt: timestamp,
  };
};
