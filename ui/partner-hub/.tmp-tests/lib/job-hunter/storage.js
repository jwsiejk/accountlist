"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveJobHunterStore = exports.loadJobHunterStore = exports.validateJobSources = exports.isValidJobSourceConfig = exports.JOB_HUNTER_STORAGE_KEY = void 0;
const applications_1 = require("./applications");
const discoveryAutomation_1 = require("./discoveryAutomation");
const preferences_1 = require("./preferences");
const resumeProfile_1 = require("./resumeProfile");
exports.JOB_HUNTER_STORAGE_KEY = "partner-hub:job-hunter:v1";
const DEFAULT_STORE = {
    jobs: [],
    jobsById: {},
    selectedJobIds: [],
    sources: [],
    applications: [],
    applicationsById: {},
    preferences: (0, preferences_1.getDefaultPreferences)(),
    automation: discoveryAutomation_1.DEFAULT_AUTOMATION_SETTINGS,
};
const BOARD_TYPES = ["greenhouse", "lever", "ashby", "smartrecruiters"];
const normalizeSelectedJobIds = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return Array.from(new Set(value.filter((item) => typeof item === "string" && item.trim().length > 0)));
};
const normalizeChecklist = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ...applications_1.DEFAULT_APPLY_CHECKLIST };
    }
    const list = value;
    return {
        resumeReviewed: Boolean(list.resumeReviewed),
        coverLetterReviewed: Boolean(list.coverLetterReviewed),
        screenerAnswersReviewed: Boolean(list.screenerAnswersReviewed),
        appliedExternally: Boolean(list.appliedExternally),
        followUpScheduled: Boolean(list.followUpScheduled),
    };
};
const normalizeApplication = (value) => ({
    ...value,
    checklist: normalizeChecklist(value.checklist),
    workflow: value.workflow && typeof value.workflow === "object" && !Array.isArray(value.workflow)
        ? {
            ...applications_1.DEFAULT_GUIDED_APPLY_WORKFLOW,
            ...value.workflow,
        }
        : { ...applications_1.DEFAULT_GUIDED_APPLY_WORKFLOW },
    jobSnapshot: value.jobSnapshot && typeof value.jobSnapshot === "object"
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
const toApplicationsById = (applications) => applications.reduce((acc, application) => {
    acc[application.jobId] = normalizeApplication(application);
    return acc;
}, {});
const isValidJobSourceConfig = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const source = value;
    return (typeof source.company === "string" &&
        source.company.trim().length > 0 &&
        typeof source.boardToken === "string" &&
        source.boardToken.trim().length > 0 &&
        typeof source.boardType === "string" &&
        BOARD_TYPES.includes(source.boardType));
};
exports.isValidJobSourceConfig = isValidJobSourceConfig;
const validateJobSources = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter((source) => (0, exports.isValidJobSourceConfig)(source))
        .map((source) => ({
        company: source.company.trim(),
        boardType: source.boardType,
        boardToken: source.boardToken.trim(),
    }));
};
exports.validateJobSources = validateJobSources;
const loadJobHunterStore = () => {
    if (typeof window === "undefined") {
        return DEFAULT_STORE;
    }
    try {
        const raw = window.localStorage.getItem(exports.JOB_HUNTER_STORAGE_KEY);
        if (!raw) {
            return DEFAULT_STORE;
        }
        const parsed = JSON.parse(raw);
        const jobsById = parsed.jobsById && typeof parsed.jobsById === "object" && !Array.isArray(parsed.jobsById)
            ? parsed.jobsById
            : {};
        const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : Object.values(jobsById);
        const applicationsFromArray = Array.isArray(parsed.applications)
            ? parsed.applications.filter((item) => Boolean(item && item.jobId)).map(normalizeApplication)
            : [];
        const rawApplicationsById = parsed.applicationsById && typeof parsed.applicationsById === "object" && !Array.isArray(parsed.applicationsById)
            ? parsed.applicationsById
            : toApplicationsById(applicationsFromArray);
        const applicationsById = Object.entries(rawApplicationsById).reduce((acc, [jobId, application]) => {
            const normalized = normalizeApplication({ ...application, jobId });
            acc[jobId] = {
                ...normalized,
                checklist: (0, applications_1.getApplicationChecklist)(normalized),
                workflow: (0, applications_1.getApplicationWorkflow)(normalized),
            };
            return acc;
        }, {});
        const applications = Object.values(applicationsById);
        return {
            jobs,
            jobsById,
            selectedJobIds: normalizeSelectedJobIds(parsed.selectedJobIds),
            sources: (0, exports.validateJobSources)(parsed.sources),
            lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : undefined,
            applications,
            applicationsById,
            resumeProfile: parsed.resumeProfile ? (0, resumeProfile_1.normalizeResumeProfile)(parsed.resumeProfile) : undefined,
            preferences: parsed.preferences ? (0, preferences_1.normalizePreferences)(parsed.preferences) : (0, preferences_1.getDefaultPreferences)(),
            automation: (0, discoveryAutomation_1.normalizeAutomationSettings)(parsed.automation),
        };
    }
    catch {
        return DEFAULT_STORE;
    }
};
exports.loadJobHunterStore = loadJobHunterStore;
const saveJobHunterStore = (store) => {
    if (typeof window === "undefined") {
        return;
    }
    const applicationsById = Object.entries(store.applicationsById ?? {}).reduce((acc, [jobId, application]) => {
        acc[jobId] = {
            ...application,
            checklist: (0, applications_1.getApplicationChecklist)(application),
            workflow: (0, applications_1.getApplicationWorkflow)(application),
        };
        return acc;
    }, {});
    window.localStorage.setItem(exports.JOB_HUNTER_STORAGE_KEY, JSON.stringify({
        ...store,
        applicationsById,
        applications: Object.values(applicationsById),
        resumeProfile: store.resumeProfile ? (0, resumeProfile_1.normalizeResumeProfile)(store.resumeProfile) : undefined,
        preferences: (0, preferences_1.normalizePreferences)(store.preferences),
        automation: (0, discoveryAutomation_1.normalizeAutomationSettings)(store.automation),
    }));
};
exports.saveJobHunterStore = saveJobHunterStore;
