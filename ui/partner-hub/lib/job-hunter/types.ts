export type JobSource = "manual" | "linkedin" | "company-site" | "referral" | "other";

export type BoardType = "greenhouse" | "lever";

export type JobSourceConfig = {
  company: string;
  boardType: BoardType;
  boardToken: string;
};

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn";

export type JobPosting = {
  id: string;
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  source: JobSource;
  sourceUrl?: string;
  externalId?: string;
  department?: string;
  postedAt?: string;
  isRemote?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Application = {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  appliedAt?: string;
  nextStepAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobHunterStore = {
  jobs: JobPosting[];
  jobsById: Record<string, JobPosting>;
  sources: JobSourceConfig[];
  lastSyncedAt?: string;
  applications: Application[];
};
