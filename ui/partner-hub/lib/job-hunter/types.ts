export type JobSource = "manual" | "linkedin" | "company-site" | "referral" | "other";

export type BoardType = "greenhouse" | "lever" | "ashby" | "smartrecruiters";

export type JobSourceConfig = {
  company: string;
  boardType: BoardType;
  boardToken: string;
};

export type JobSourceOrigin = "catalog" | "manual" | "catalog+manual";

export type JobSourceSyncDiagnostic = {
  sourceId: string;
  company: string;
  provider: BoardType;
  token: string;
  success: boolean;
  jobsFetched: number;
  error?: string;
  sourceOrigin?: JobSourceOrigin;
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

export type GuidedApplyWorkflow = {
  selectedForApply: boolean;
  tailoredResumeReady: boolean;
  coverLetterReady: boolean;
  screenerAnswersReady: boolean;
  externalApplicationOpened: boolean;
  tailoredResumeUploaded: boolean;
  customQuestionsCompleted: boolean;
  finalExternalSubmitConfirmed: boolean;
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
  workflow?: GuidedApplyWorkflow;
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

export type TailoredResumeExperience = ResumeExperience & {
  selectedBullets: string[];
  suppressedBullets: string[];
};

export type TailoredResumeVariant = {
  jobId: string;
  generatedAt: string;
  baseSummary: string;
  tailoredHeadline: string;
  tailoredSummary: string;
  prioritizedSkills: string[];
  experience: TailoredResumeExperience[];
  deltaSummary: string[];
  markdown: string;
  plainText: string;
};


export type JobWorkArrangement = "remote" | "hybrid" | "onsite" | "unknown";

export type JobHunterPreferences = {
  targetRoles: string[];
  targetKeywords: string[];
  targetLocations: string[];
  preferredHybridLocations: string[];
  preferredRemoteRegions: string[];
  allowRemoteRoles: boolean;
  allowHybridRoles: boolean;
  allowOnsiteRoles: boolean;
  remoteOnly?: boolean;
  excludedCompanies: string[];
  excludedTitles: string[];
  minimumScore?: number;
};

export type JobHunterAutomationSettings = {
  autoSyncOnJobsOpen: boolean;
  autoSyncIfOlderThanHours: number;
  topMatchesLimit: number;
};


export type JobHunterConversationType = "initial_outreach" | "follow_up" | "post_interview_thanks";

export type JobHunterConversationMessageRole = "user" | "assistant" | "contact";

export type JobHunterConversationMessage = {
  id: string;
  role: JobHunterConversationMessageRole;
  body: string;
  createdAt: string;
};

export type JobHunterConversationThread = {
  id: string;
  jobId: string;
  type: JobHunterConversationType;
  title?: string;
  messages: JobHunterConversationMessage[];
  createdAt: string;
  updatedAt: string;
};

export type JobHunterConversationDraft = {
  type: JobHunterConversationType;
  subject: string;
  body: string;
  createdAt: string;
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
  automation?: JobHunterAutomationSettings;
  conversations?: JobHunterConversationThread[];
  conversationsById?: Record<string, JobHunterConversationThread>;
};
