export type JobSource = "manual" | "linkedin" | "company-site" | "referral" | "other";

export type BoardType = "greenhouse" | "lever";

export type JobSourceConfig = {
  company: string;
  boardType: BoardType;
  boardToken: string;
};

export type ApplicationStatus = "prepared" | "applied" | "interview" | "rejected" | "offer";

export type ApplicationJobSnapshot = {
  jobId: string;
  title: string;
  company: string;
  location?: string;
  sourceUrl?: string;
  department?: string;
  postedAt?: string;
};

export type ApplyChecklist = {
  resumeReviewed: boolean;
  coverLetterReviewed: boolean;
  screenerAnswersReviewed: boolean;
  appliedExternally: boolean;
  followUpScheduled: boolean;
};

export type JobPosting = {
  id: string;
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  employmentType?: string;
  sourceProvider?: BoardType;
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
  reminderAt?: string;
  interviewedAt?: string;
  offeredAt?: string;
  rejectedAt?: string;
  notes?: string;
  checklist?: ApplyChecklist;
  jobSnapshot?: ApplicationJobSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type ResumeExperience = {
  company: string;
  title: string;
  start?: string;
  end?: string;
  bullets: string[];
};

export type ResumeProfile = {
  fullName: string;
  email: string;
  phone: string;
  cityState: string;
  linkedinUrl: string;
  websiteUrl?: string;
  workAuthorizationNote: string;
  signatureLine: string;
  headline?: string;
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  achievements: string[];
};


export type JobHunterPreferences = {
  targetRoles: string[];
  targetKeywords: string[];
  targetLocations: string[];
  remoteOnly?: boolean;
  excludedCompanies: string[];
  excludedTitles: string[];
  minimumScore?: number;
};

export type JobHunterStore = {
  jobs: JobPosting[];
  jobsById: Record<string, JobPosting>;
  selectedJobIds: string[];
  sources: JobSourceConfig[];
  lastSyncedAt?: string;
  applications: Application[];
  applicationsById: Record<string, Application>;
  resumeProfile?: ResumeProfile;
  preferences?: JobHunterPreferences;
};
