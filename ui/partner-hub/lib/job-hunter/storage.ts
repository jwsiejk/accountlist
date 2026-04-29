import { DEFAULT_APPLY_CHECKLIST, DEFAULT_GUIDED_APPLY_WORKFLOW, getApplicationChecklist, getApplicationWorkflow } from "./applications";
import { DEFAULT_AUTOMATION_SETTINGS, normalizeAutomationSettings } from "./discoveryAutomation";
import { getDefaultPreferences, normalizePreferences } from "./preferences";
import { normalizeResumeProfile } from "./resumeProfile";
import type { Application, ApplyChecklist, BoardType, GuidedApplyWorkflow, JobHunterConversationThread, JobHunterStore, JobSourceConfig } from "./types";

export const JOB_HUNTER_STORAGE_KEY = "partner-hub:job-hunter:v1";

const DEFAULT_STORE: JobHunterStore = {
  jobs: [],
  jobsById: {},
  selectedJobIds: [],
  sources: [],
  applications: [],
  applicationsById: {},
  preferences: getDefaultPreferences(),
  automation: DEFAULT_AUTOMATION_SETTINGS,
  conversations: [],
  conversationsById: {},
};

const BOARD_TYPES: BoardType[] = ["greenhouse", "lever", "ashby", "smartrecruiters"];

const normalizeSelectedJobIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)));
};

const normalizeChecklist = (value: unknown): ApplyChecklist => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_APPLY_CHECKLIST };
  }

  const list = value as Partial<ApplyChecklist>;
  return {
    resumeReviewed: Boolean(list.resumeReviewed),
    coverLetterReviewed: Boolean(list.coverLetterReviewed),
    screenerAnswersReviewed: Boolean(list.screenerAnswersReviewed),
    appliedExternally: Boolean(list.appliedExternally),
    followUpScheduled: Boolean(list.followUpScheduled),
  };
};

const normalizeApplication = (value: Application): Application => ({
  ...value,
  checklist: normalizeChecklist(value.checklist),
  workflow:
    value.workflow && typeof value.workflow === "object" && !Array.isArray(value.workflow)
      ? {
          ...DEFAULT_GUIDED_APPLY_WORKFLOW,
          ...(value.workflow as Partial<GuidedApplyWorkflow>),
        }
      : { ...DEFAULT_GUIDED_APPLY_WORKFLOW },
  jobSnapshot:
    value.jobSnapshot && typeof value.jobSnapshot === "object"
      ? {
          jobId: value.jobSnapshot.jobId,
          title: value.jobSnapshot.title,
          company: value.jobSnapshot.company,
          location: value.jobSnapshot.location,
          sourceUrl: value.jobSnapshot.sourceUrl,
          department: value.jobSnapshot.department,
          postedAt: value.jobSnapshot.postedAt,
        }
      : undefined,
});


const normalizeConversation = (value: JobHunterConversationThread): JobHunterConversationThread => ({
  ...value,
  messages: Array.isArray(value.messages)
    ? value.messages
        .filter((m) => m && typeof m.body === "string" && typeof m.role === "string" && typeof m.createdAt === "string")
        .map((m, idx) => ({ id: typeof m.id === "string" && m.id.trim() ? m.id : `${value.id}:m-${idx + 1}`, role: m.role, body: m.body, createdAt: m.createdAt }))
    : [],
});

const toConversationsById = (conversations: JobHunterConversationThread[]) =>
  conversations.reduce<Record<string, JobHunterConversationThread>>((acc, conversation) => {
    acc[conversation.id] = normalizeConversation(conversation);
    return acc;
  }, {});
const toApplicationsById = (applications: Application[]) =>
  applications.reduce<Record<string, Application>>((acc, application) => {
    acc[application.jobId] = normalizeApplication(application);
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

    const applicationsFromArray = Array.isArray(parsed.applications)
      ? parsed.applications.filter((item): item is Application => Boolean(item && item.jobId)).map(normalizeApplication)
      : [];
    const rawApplicationsById =
      parsed.applicationsById && typeof parsed.applicationsById === "object" && !Array.isArray(parsed.applicationsById)
        ? parsed.applicationsById
        : toApplicationsById(applicationsFromArray);
    const applicationsById = Object.entries(rawApplicationsById).reduce<Record<string, Application>>((acc, [jobId, application]) => {
      const normalized = normalizeApplication({ ...application, jobId });
      acc[jobId] = {
        ...normalized,
        checklist: getApplicationChecklist(normalized),
        workflow: getApplicationWorkflow(normalized),
      };
      return acc;
    }, {});
    const applications = Object.values(applicationsById);

    const conversationsFromArray = Array.isArray(parsed.conversations)
      ? parsed.conversations.filter((item): item is JobHunterConversationThread => Boolean(item && item.id && item.jobId && item.type)).map(normalizeConversation)
      : [];
    const rawConversationsById =
      parsed.conversationsById && typeof parsed.conversationsById === "object" && !Array.isArray(parsed.conversationsById)
        ? parsed.conversationsById
        : toConversationsById(conversationsFromArray);
    const conversationsById = Object.entries(rawConversationsById).reduce<Record<string, JobHunterConversationThread>>((acc, [id, conversation]) => {
      acc[id] = normalizeConversation({ ...conversation, id });
      return acc;
    }, {});
    const conversations = Object.values(conversationsById);

    return {
      jobs,
      jobsById,
      selectedJobIds: normalizeSelectedJobIds(parsed.selectedJobIds),
      sources: validateJobSources(parsed.sources),
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : undefined,
      applications,
      applicationsById,
      resumeProfile: parsed.resumeProfile ? normalizeResumeProfile(parsed.resumeProfile) : undefined,
      preferences: parsed.preferences ? normalizePreferences(parsed.preferences) : getDefaultPreferences(),
      automation: normalizeAutomationSettings(parsed.automation),
      conversations,
      conversationsById,
    };
  } catch {
    return DEFAULT_STORE;
  }
};

export const saveJobHunterStore = (store: JobHunterStore) => {
  if (typeof window === "undefined") {
    return;
  }

  const applicationsById = Object.entries(store.applicationsById ?? {}).reduce<Record<string, Application>>((acc, [jobId, application]) => {
    acc[jobId] = {
      ...application,
      checklist: getApplicationChecklist(application),
      workflow: getApplicationWorkflow(application),
    };
    return acc;
  }, {});

  const conversationsById = Object.entries(store.conversationsById ?? {}).reduce<Record<string, JobHunterConversationThread>>((acc, [id, conversation]) => {
    acc[id] = normalizeConversation({ ...conversation, id });
    return acc;
  }, {});

  window.localStorage.setItem(
    JOB_HUNTER_STORAGE_KEY,
    JSON.stringify({
      ...store,
      applicationsById,
      applications: Object.values(applicationsById),
      resumeProfile: store.resumeProfile ? normalizeResumeProfile(store.resumeProfile) : undefined,
      preferences: normalizePreferences(store.preferences),
      automation: normalizeAutomationSettings(store.automation),
      conversationsById,
      conversations: Object.values(conversationsById),
    }),
  );
};
