import { normalizeJobPosting } from "./normalize";
import { fetchGreenhouseJobs } from "./sources/greenhouse";
import { fetchLeverJobs } from "./sources/lever";
import type { JobPosting, JobSourceConfig } from "./types";

const normalizeJobs = (jobs: JobPosting[]) => {
  const merged = new Map<string, JobPosting>();

  jobs.forEach((job) => {
    const normalized = normalizeJobPosting({
      source: job.id.startsWith("lever:") ? "lever" : "greenhouse",
      externalId: job.externalId ?? job.id,
      company: job.company,
      title: job.title,
      location: job.location,
      department: job.department,
      url: job.sourceUrl ?? "",
      postedAt: job.postedAt,
    });

    const existing = merged.get(normalized.id);
    if (!existing) {
      merged.set(normalized.id, normalized);
      return;
    }

    const existingDate = existing.postedAt ?? existing.updatedAt;
    const normalizedDate = normalized.postedAt ?? normalized.updatedAt;

    if (normalizedDate >= existingDate) {
      merged.set(normalized.id, normalized);
    }
  });

  return Array.from(merged.values()).sort((a, b) => {
    const aDate = a.postedAt ?? a.updatedAt;
    const bDate = b.postedAt ?? b.updatedAt;
    return bDate.localeCompare(aDate);
  });
};

export const runJobSync = async (sources: JobSourceConfig[]) => {
  const jobs: JobPosting[] = [];

  for (const source of sources) {
    if (source.boardType === "greenhouse") {
      const results = await fetchGreenhouseJobs(source);
      jobs.push(...results);
    }

    if (source.boardType === "lever") {
      const results = await fetchLeverJobs(source);
      jobs.push(...results);
    }
  }

  return normalizeJobs(jobs);
};

export const __private__ = {
  normalizeJobs,
};
