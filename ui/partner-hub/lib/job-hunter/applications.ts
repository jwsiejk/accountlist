import type { Application, ApplicationStatus, ApplyChecklist, ApplicationJobSnapshot, JobPosting } from "./types";

export const APPLICATION_STATUSES: ApplicationStatus[] = ["prepared", "applied", "interview", "rejected", "offer"];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  prepared: "Prepared",
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  offer: "Offer",
};

export const DEFAULT_APPLY_CHECKLIST: ApplyChecklist = {
  resumeReviewed: false,
  coverLetterReviewed: false,
  screenerAnswersReviewed: false,
  appliedExternally: false,
  followUpScheduled: false,
};

export type ChecklistKey = keyof ApplyChecklist;

export type ApplicationAction =
  | { type: "upsertFromJob"; job: JobPosting; now?: string }
  | { type: "setStatus"; jobId: string; status: ApplicationStatus; now?: string }
  | { type: "setReminder"; jobId: string; reminderAt?: string; now?: string }
  | { type: "setNotes"; jobId: string; notes?: string; now?: string }
  | { type: "setChecklistItem"; jobId: string; item: ChecklistKey; value: boolean; now?: string }
  | { type: "ensureSnapshotFromJob"; jobId: string; job: JobPosting; now?: string };

export const buildFollowUpEmail = (job: JobPosting) => {
  return `Hi ${job.company} recruiting team,\n\nI applied for the ${job.title} role and wanted to follow up on next steps. I remain very interested in the position and would be happy to share any additional information.\n\nBest regards,\n[Your Name]`;
};

export const buildAnswerPack = (job: JobPosting) => {
  return [
    `Role: ${job.title} at ${job.company}`,
    `Link: ${job.sourceUrl ?? "Add job posting URL"}`,
    "Why this role: I can contribute quickly with directly relevant experience in this area.",
    "Strengths: execution ownership, stakeholder communication, measurable impact.",
    "Compensation: open to a market-competitive package based on scope and level.",
    "Availability: can interview this week and start after notice requirements.",
  ].join("\n");
};

const statusTimestampPatch = (status: ApplicationStatus, now: string): Partial<Application> => {
  if (status === "applied") return { appliedAt: now };
  if (status === "interview") return { interviewedAt: now };
  if (status === "rejected") return { rejectedAt: now };
  if (status === "offer") return { offeredAt: now };
  return {};
};

export const toJobSnapshot = (job: JobPosting): ApplicationJobSnapshot => ({
  jobId: job.id,
  title: job.title,
  company: job.company,
  location: job.location,
  sourceUrl: job.sourceUrl,
  department: job.department,
  postedAt: job.postedAt,
});

export const createApplicationFromJob = (job: JobPosting, now: string): Application => ({
  id: job.id,
  jobId: job.id,
  status: "prepared",
  checklist: { ...DEFAULT_APPLY_CHECKLIST },
  createdAt: now,
  updatedAt: now,
});

export const getApplicationChecklist = (application: Application): ApplyChecklist => ({
  ...DEFAULT_APPLY_CHECKLIST,
  ...(application.checklist ?? {}),
});

export const resolveApplicationJobDetails = (application: Application, jobsById: Record<string, JobPosting>) => {
  const liveJob = jobsById[application.jobId];

  if (liveJob) {
    return {
      missingLiveJob: false,
      title: liveJob.title,
      company: liveJob.company,
      location: liveJob.location,
      sourceUrl: liveJob.sourceUrl,
      department: liveJob.department,
      postedAt: liveJob.postedAt,
    };
  }

  const snapshot = application.jobSnapshot;
  return {
    missingLiveJob: true,
    title: snapshot?.title ?? "Unknown role",
    company: snapshot?.company ?? "Unknown company",
    location: snapshot?.location,
    sourceUrl: snapshot?.sourceUrl,
    department: snapshot?.department,
    postedAt: snapshot?.postedAt,
  };
};

export const applicationReducer = (
  state: Record<string, Application>,
  action: ApplicationAction,
): Record<string, Application> => {
  const now = action.now ?? new Date().toISOString();

  if (action.type === "upsertFromJob") {
    const existing = state[action.job.id];
    if (existing) {
      return state;
    }

    return {
      ...state,
      [action.job.id]: createApplicationFromJob(action.job, now),
    };
  }

  const existing = state[action.jobId];
  if (!existing) {
    return state;
  }

  if (action.type === "setStatus") {
    const next: Application = {
      ...existing,
      status: action.status,
      updatedAt: now,
      ...statusTimestampPatch(action.status, now),
      checklist: getApplicationChecklist(existing),
    };

    return {
      ...state,
      [action.jobId]: next,
    };
  }

  if (action.type === "setReminder") {
    return {
      ...state,
      [action.jobId]: {
        ...existing,
        reminderAt: action.reminderAt,
        checklist: getApplicationChecklist(existing),
        updatedAt: now,
      },
    };
  }

  if (action.type === "setNotes") {
    return {
      ...state,
      [action.jobId]: {
        ...existing,
        notes: action.notes,
        checklist: getApplicationChecklist(existing),
        updatedAt: now,
      },
    };
  }

  if (action.type === "setChecklistItem") {
    return {
      ...state,
      [action.jobId]: {
        ...existing,
        checklist: {
          ...getApplicationChecklist(existing),
          [action.item]: action.value,
        },
        updatedAt: now,
      },
    };
  }

  if (action.type === "ensureSnapshotFromJob") {
    if (existing.jobSnapshot) {
      return state;
    }

    return {
      ...state,
      [action.jobId]: {
        ...existing,
        checklist: getApplicationChecklist(existing),
        jobSnapshot: toJobSnapshot(action.job),
        updatedAt: now,
      },
    };
  }

  return state;
};

export const exportApplicationsCsv = (applications: Application[], jobsById: Record<string, JobPosting>) => {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = [
    "jobId",
    "company",
    "title",
    "status",
    "notes",
    "createdAt",
    "appliedAt",
    "interviewedAt",
    "offeredAt",
    "rejectedAt",
    "reminderAt",
    "updatedAt",
  ];

  const rows = applications.map((application) => {
    const jobDetails = resolveApplicationJobDetails(application, jobsById);
    return [
      application.jobId,
      jobDetails.company,
      jobDetails.title,
      application.status,
      application.notes ?? "",
      application.createdAt,
      application.appliedAt ?? "",
      application.interviewedAt ?? "",
      application.offeredAt ?? "",
      application.rejectedAt ?? "",
      application.reminderAt ?? "",
      application.updatedAt,
    ]
      .map((value) => escape(value))
      .join(",");
  });

  return [header.map((value) => escape(value)).join(","), ...rows].join("\n");
};
