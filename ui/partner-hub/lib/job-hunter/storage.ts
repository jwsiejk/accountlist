import type { Application, BoardType, JobHunterStore, JobSourceConfig } from "./types";

export const JOB_HUNTER_STORAGE_KEY = "partner-hub:job-hunter:v1";

const DEFAULT_STORE: JobHunterStore = {
  jobs: [],
  jobsById: {},
  sources: [],
  applications: [],
  applicationsById: {},
};

const BOARD_TYPES: BoardType[] = ["greenhouse", "lever"];

const toApplicationsById = (applications: Application[]) =>
  applications.reduce<Record<string, Application>>((acc, application) => {
    acc[application.jobId] = application;
    return acc;
  }, {});

export const isValidJobSourceConfig = (value: unknown): value is JobSourceConfig => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const source = value as Partial<JobSourceConfig>;
  return (
    typeof source.company === "string" &&
    source.company.trim().length > 0 &&
    typeof source.boardToken === "string" &&
    source.boardToken.trim().length > 0 &&
    typeof source.boardType === "string" &&
    BOARD_TYPES.includes(source.boardType as BoardType)
  );
};

export const validateJobSources = (value: unknown): JobSourceConfig[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((source): source is JobSourceConfig => isValidJobSourceConfig(source))
    .map((source) => ({
      company: source.company.trim(),
      boardType: source.boardType,
      boardToken: source.boardToken.trim(),
    }));
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

    const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : Object.values(jobsById);

    const applicationsFromArray = Array.isArray(parsed.applications) ? parsed.applications : [];
    const applicationsById =
      parsed.applicationsById && typeof parsed.applicationsById === "object" && !Array.isArray(parsed.applicationsById)
        ? parsed.applicationsById
        : toApplicationsById(applicationsFromArray);
    const applications = Object.values(applicationsById);

    return {
      jobs,
      jobsById,
      sources: validateJobSources(parsed.sources),
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : undefined,
      applications,
      applicationsById,
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
