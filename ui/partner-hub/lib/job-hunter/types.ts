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

export type ConversationTargetRelationship = "recruiter" | "hiring_manager" | "employee" | "referral" | "unknown";
export type ConversationTargetSource = "manual" | "linkedin" | "company_site" | "imported" | "other";
export type OutreachChannel = "linkedin" | "email" | "manual";
export type OutreachStage = "intro" | "follow_up_1" | "follow_up_2" | "referral_request" | "thank_you" | "nurture";
export type OutreachStatus = "draft" | "queued" | "sent" | "replied" | "skipped";

export type ConversationTarget = {
  id: string;
  company: string;
  name: string;
  title?: string;
  profileUrl?: string;
  email?: string;
  relationshipType: ConversationTargetRelationship;
  source: ConversationTargetSource;
  confidence: number;
  notes?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationBrief = {
  id: string;
  jobId: string;
  company: string;
  roleTitle: string;
  reasonToPursue: string;
  likelyHiringPriorities: string[];
  likelyPainPoints: string[];
  candidateFit: string[];
  riskAreas: string[];
  messageAngle: string;
  proofPoints: string[];
  recommendedTargets: string[];
  createdAt: string;
  updatedAt: string;
};

export type OutreachSequence = {
  id: string;
  jobId: string;
  contactId: string;
  stage: OutreachStage;
  channel: OutreachChannel;
  generatedMessage: string;
  editedMessage?: string;
  status: OutreachStatus;
  dueAt?: string;
  sentAt?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
};


export type ConversationDailyActionType = "send_follow_up" | "review_reply" | "send_draft" | "add_target" | "review_stale_sent";
export type ConversationDailyActionPriority = "high" | "medium" | "low";

export type ConversationDailyAction = {
  id: string;
  type: ConversationDailyActionType;
  priority: ConversationDailyActionPriority;
  label: string;
  description: string;
  company?: string;
  roleTitle?: string;
  contactName?: string;
  dueAt?: string;
};

export type JobHunterConversationType = "initial_outreach" | "follow_up" | "post_interview_thanks";
export type JobHunterConversationMessageRole = "user" | "assistant" | "contact";
export type JobHunterConversationMessage = { id: string; role: JobHunterConversationMessageRole; body: string; createdAt: string };
export type JobHunterConversationThread = { id: string; jobId: string; type: JobHunterConversationType; title?: string; messages: JobHunterConversationMessage[]; createdAt: string; updatedAt: string };
export type JobHunterConversationDraft = { type: JobHunterConversationType; subject: string; body: string; createdAt: string };
export type ConversationOutcomeType =
  | "reply_received"
  | "conversation_started"
  | "referral_received"
  | "recruiter_screen"
  | "interview_scheduled"
  | "rejected"
  | "offer_received"
  | "closed_no_response";
export type ConversationOutcome = {
  id: string;
  sequenceId: string;
  jobId: string;
  contactId: string;
  type: ConversationOutcomeType;
  createdAt: string;
  notes?: string;
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
  conversationTargets: ConversationTarget[];
  conversationTargetsById: Record<string, ConversationTarget>;
  conversationBriefs: ConversationBrief[];
  conversationBriefsById: Record<string, ConversationBrief>;
  outreachSequences: OutreachSequence[];
  outreachSequencesById: Record<string, OutreachSequence>;
  conversationOutcomes?: ConversationOutcome[];
  conversationOutcomesById?: Record<string, ConversationOutcome>;
};
