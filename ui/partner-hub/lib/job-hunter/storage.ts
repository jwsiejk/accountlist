import type { JobHunterStore } from "./types";

export const JOB_HUNTER_STORAGE_KEY = "partner-hub:job-hunter:v1";

const DEFAULT_STORE: JobHunterStore = {
  jobs: [],
  jobsById: {},
  sources: [],
  applications: [],
};

export const loadJobHunterStore = (): JobHunterStore => {
  if (typeof window === "undefined") {
    return DEFAULT_STORE;
  }

  try {
    const raw = window.localStorage.getItem(JOB_HUNTER_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STORE;
    }

    const parsed = JSON.parse(raw) as Partial<JobHunterStore>;
    const jobsById =
      parsed.jobsById && typeof parsed.jobsById === "object" && !Array.isArray(parsed.jobsById)
        ? parsed.jobsById
        : {};

    const jobs = Array.isArray(parsed.jobs)
      ? parsed.jobs
      : Object.values(jobsById);

    return {
      jobs,
      jobsById,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : undefined,
      applications: Array.isArray(parsed.applications) ? parsed.applications : [],
    };
  } catch {
    return DEFAULT_STORE;
  }
};

export const saveJobHunterStore = (store: JobHunterStore) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(JOB_HUNTER_STORAGE_KEY, JSON.stringify(store));
};
