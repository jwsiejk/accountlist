import type { JobHunterStore } from "./types";

export const JOB_HUNTER_STORAGE_KEY = "partner-hub:job-hunter:v1";

const DEFAULT_STORE: JobHunterStore = {
  jobs: [],
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
    return {
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
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
