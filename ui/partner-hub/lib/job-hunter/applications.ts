import type { Application, ApplicationStatus, JobPosting } from "./types";

export const APPLICATION_STATUSES: ApplicationStatus[] = ["prepared", "applied", "interview", "rejected", "offer"];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  prepared: "Prepared",
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  offer: "Offer",
};

export type ApplicationAction =
  | { type: "upsertFromJob"; job: JobPosting; now?: string }
  | { type: "setStatus"; jobId: string; status: ApplicationStatus; now?: string }
  | { type: "setReminder"; jobId: string; reminderAt?: string; now?: string };

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

export const createApplicationFromJob = (job: JobPosting, now: string): Application => ({
  id: job.id,
  jobId: job.id,
  status: "prepared",
  createdAt: now,
  updatedAt: now,
});

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
    const next = {
      ...existing,
      status: action.status,
      updatedAt: now,
      ...statusTimestampPatch(action.status, now),
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
    "createdAt",
    "appliedAt",
    "interviewedAt",
    "offeredAt",
    "rejectedAt",
    "reminderAt",
    "updatedAt",
  ];

  const rows = applications.map((application) => {
    const job = jobsById[application.jobId];
    return [
      application.jobId,
      job?.company ?? "",
      job?.title ?? "",
      application.status,
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
