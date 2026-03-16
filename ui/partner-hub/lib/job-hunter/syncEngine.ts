import { normalizeJobPosting } from "./normalize";
import { fetchAshbyJobs } from "./sources/ashby";
import { fetchGreenhouseJobs } from "./sources/greenhouse";
import { fetchLeverJobs } from "./sources/lever";
import { fetchSmartRecruitersJobs } from "./sources/smartrecruiters";
import type { BoardType, JobPosting, JobSourceConfig, JobSourceSyncDiagnostic } from "./types";

const detectSourceProvider = (job: JobPosting): BoardType => {
  if (job.sourceProvider) {
    return job.sourceProvider as BoardType;
  }

  const prefix = job.id.split(":")[0];
  if (prefix === "greenhouse" || prefix === "lever" || prefix === "ashby" || prefix === "smartrecruiters") {
    return prefix;
  }

  return "greenhouse";
};

const normalizeJobs = (jobs: JobPosting[]) => {
  const merged = new Map<string, JobPosting>();

  jobs.forEach((job) => {
    const normalized = normalizeJobPosting({
      source: detectSourceProvider(job),
      externalId: job.externalId ?? job.id,
      company: job.company,
      title: job.title,
      location: job.location,
      department: job.department,
      salaryRange: job.salaryRange,
      employmentType: job.employmentType,
      notes: job.notes,
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

export const fetchJobsForSource = async (source: JobSourceConfig): Promise<JobPosting[]> => {
  if (source.boardType === "greenhouse") {
    return fetchGreenhouseJobs(source);
  }

  if (source.boardType === "lever") {
    return fetchLeverJobs(source);
  }

  if (source.boardType === "ashby") {
    return fetchAshbyJobs(source);
  }

  if (source.boardType === "smartrecruiters") {
    return fetchSmartRecruitersJobs(source);
  }

  return [];
};

const toSourceId = (source: JobSourceConfig) => `${source.boardType}:${source.boardToken}`;

export const runJobSync = async (
  sources: JobSourceConfig[],
): Promise<{ jobs: JobPosting[]; diagnostics: JobSourceSyncDiagnostic[] }> => {
  const jobs: JobPosting[] = [];
  const diagnostics: JobSourceSyncDiagnostic[] = [];

  for (const source of sources) {
    try {
      const results = await fetchJobsForSource(source);
      jobs.push(...results);
      diagnostics.push({
        sourceId: toSourceId(source),
        company: source.company,
        provider: source.boardType,
        token: source.boardToken,
        success: true,
        jobsFetched: results.length,
      });
    } catch (error) {
      diagnostics.push({
        sourceId: toSourceId(source),
        company: source.company,
        provider: source.boardType,
        token: source.boardToken,
        success: false,
        jobsFetched: 0,
        error: error instanceof Error ? error.message : "Unknown sync error",
      });
    }
  }

  return {
    jobs: normalizeJobs(jobs),
    diagnostics,
  };
};

export const __private__ = {
  normalizeJobs,
};
