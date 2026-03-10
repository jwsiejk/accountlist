import type {
  Application,
  ApplicationStatus,
  ApplyChecklist,
  ApplicationJobSnapshot,
  GuidedApplyWorkflow,
  JobPosting,
  ResumeProfile,
} from "./types";

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

export const DEFAULT_GUIDED_APPLY_WORKFLOW: GuidedApplyWorkflow = {
  selectedForApply: false,
  tailoredResumeReady: false,
  coverLetterReady: false,
  screenerAnswersReady: false,
  externalApplicationOpened: false,
  tailoredResumeUploaded: false,
  customQuestionsCompleted: false,
  finalExternalSubmitConfirmed: false,
  followUpScheduled: false,
};

export type ChecklistKey = keyof ApplyChecklist;
export type WorkflowKey = keyof GuidedApplyWorkflow;

export type ApplicationQueueStage = "untracked" | "selected" | "prepared" | "in-progress" | "applied";

export type ApplicationAction =
  | { type: "upsertFromJob"; job: JobPosting; now?: string }
  | { type: "setStatus"; jobId: string; status: ApplicationStatus; now?: string }
  | { type: "setReminder"; jobId: string; reminderAt?: string; now?: string }
  | { type: "setNotes"; jobId: string; notes?: string; now?: string }
  | { type: "setChecklistItem"; jobId: string; item: ChecklistKey; value: boolean; now?: string }
  | { type: "setWorkflowItem"; jobId: string; item: WorkflowKey; value: boolean; now?: string }
  | { type: "ensureSnapshotFromJob"; jobId: string; job: JobPosting; now?: string };

export const buildFollowUpEmail = (job: JobPosting, profile?: ResumeProfile) => {
  const signatureLine = profile?.signatureLine?.trim() || "Best regards,";
  const signerName = profile?.fullName?.trim() || "Candidate";

  return `Hi ${job.company} recruiting team,\n\nI applied for the ${job.title} role and wanted to follow up on next steps. I remain very interested in the position and would be happy to share any additional information.\n\n${signatureLine}\n${signerName}`;
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
  workflow: { ...DEFAULT_GUIDED_APPLY_WORKFLOW },
  createdAt: now,
  updatedAt: now,
});

export const getApplicationChecklist = (application: Application): ApplyChecklist => ({
  ...DEFAULT_APPLY_CHECKLIST,
  ...(application.checklist ?? {}),
});

export const getApplicationWorkflow = (application: Application): GuidedApplyWorkflow => {
  const checklist = getApplicationChecklist(application);
  const workflow = {
    ...DEFAULT_GUIDED_APPLY_WORKFLOW,
    ...(application.workflow ?? {}),
  };

  return {
    ...workflow,
    tailoredResumeReady: workflow.tailoredResumeReady || checklist.resumeReviewed,
    coverLetterReady: workflow.coverLetterReady || checklist.coverLetterReviewed,
    screenerAnswersReady: workflow.screenerAnswersReady || checklist.screenerAnswersReviewed,
    finalExternalSubmitConfirmed: workflow.finalExternalSubmitConfirmed || checklist.appliedExternally,
    followUpScheduled: workflow.followUpScheduled || checklist.followUpScheduled,
  };
};

export const getApplicationQueueStage = (application: Application): ApplicationQueueStage => {
  if (application.status === "applied" || application.status === "interview" || application.status === "offer" || application.status === "rejected") {
    return "applied";
  }

  const workflow = getApplicationWorkflow(application);
  if (!workflow.selectedForApply) {
    return "untracked";
  }

  if (
    workflow.tailoredResumeReady &&
    workflow.coverLetterReady &&
    workflow.screenerAnswersReady &&
    !workflow.externalApplicationOpened
  ) {
    return "prepared";
  }

  if (workflow.externalApplicationOpened || workflow.tailoredResumeUploaded || workflow.customQuestionsCompleted) {
    return "in-progress";
  }

  return "selected";
};

const hasInProgressWorkflowSignals = (workflow: GuidedApplyWorkflow) =>
  workflow.externalApplicationOpened ||
  workflow.tailoredResumeUploaded ||
  workflow.customQuestionsCompleted ||
  workflow.finalExternalSubmitConfirmed;

export const shouldPreserveWorkflowSelection = (application: Application) => {
  if (application.status === "applied" || application.status === "interview" || application.status === "offer" || application.status === "rejected") {
    return true;
  }

  return hasInProgressWorkflowSignals(getApplicationWorkflow(application));
};

export const shouldShowInApplicationsPipeline = (application: Application) => {
  if (application.status === "applied" || application.status === "interview" || application.status === "offer" || application.status === "rejected") {
    return true;
  }

  const workflow = getApplicationWorkflow(application);
  return workflow.selectedForApply || hasInProgressWorkflowSignals(workflow);
};

export const syncWorkflowSelectionWithQueue = (
  applicationsById: Record<string, Application>,
  selectedJobIds: string[],
  now?: string,
) => {
  const selectedSet = new Set(selectedJobIds);
  let next = applicationsById;

  Object.values(applicationsById).forEach((application) => {
    const workflow = getApplicationWorkflow(application);
    const inQueue = selectedSet.has(application.jobId);
    const desiredSelectedForApply = inQueue || (!inQueue && workflow.selectedForApply && shouldPreserveWorkflowSelection(application));

    if (desiredSelectedForApply === workflow.selectedForApply) {
      return;
    }

    next = applicationReducer(next, {
      type: "setWorkflowItem",
      jobId: application.jobId,
      item: "selectedForApply",
      value: desiredSelectedForApply,
      now,
    });
  });

  return next;
};

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
      workflow: {
        ...getApplicationWorkflow(existing),
        finalExternalSubmitConfirmed: action.status === "applied" ? true : getApplicationWorkflow(existing).finalExternalSubmitConfirmed,
      },
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
        workflow: getApplicationWorkflow(existing),
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
        workflow: getApplicationWorkflow(existing),
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
        workflow: {
          ...getApplicationWorkflow(existing),
          ...(action.item === "resumeReviewed" ? { tailoredResumeReady: action.value } : {}),
          ...(action.item === "coverLetterReviewed" ? { coverLetterReady: action.value } : {}),
          ...(action.item === "screenerAnswersReviewed" ? { screenerAnswersReady: action.value } : {}),
          ...(action.item === "appliedExternally" ? { finalExternalSubmitConfirmed: action.value } : {}),
          ...(action.item === "followUpScheduled" ? { followUpScheduled: action.value } : {}),
        },
        updatedAt: now,
      },
    };
  }

  if (action.type === "setWorkflowItem") {
    return {
      ...state,
      [action.jobId]: {
        ...existing,
        checklist: {
          ...getApplicationChecklist(existing),
          ...(action.item === "tailoredResumeReady" ? { resumeReviewed: action.value } : {}),
          ...(action.item === "coverLetterReady" ? { coverLetterReviewed: action.value } : {}),
          ...(action.item === "screenerAnswersReady" ? { screenerAnswersReviewed: action.value } : {}),
          ...(action.item === "finalExternalSubmitConfirmed" ? { appliedExternally: action.value } : {}),
          ...(action.item === "followUpScheduled" ? { followUpScheduled: action.value } : {}),
        },
        workflow: {
          ...getApplicationWorkflow(existing),
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
        workflow: getApplicationWorkflow(existing),
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
