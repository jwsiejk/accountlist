"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const discoveryAutomation_1 = require("./discoveryAutomation");
const preferences_1 = require("./preferences");
const storage_1 = require("./storage");
const sourceSettings_1 = require("./sourceSettings");
class MemoryStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.get(key) ?? null;
    }
    setItem(key, value) {
        this.store.set(key, value);
    }
}
(0, node_test_1.describe)("job hunter storage", () => {
    (0, node_test_1.it)("hydrates applicationsById from legacy applications array", () => {
        const storage = new MemoryStorage();
        storage.setItem(storage_1.JOB_HUNTER_STORAGE_KEY, JSON.stringify({
            jobsById: {},
            jobs: [],
            applications: [
                {
                    id: "job-1",
                    jobId: "job-1",
                    status: "prepared",
                    createdAt: "2024-03-01T10:00:00.000Z",
                    updatedAt: "2024-03-01T10:00:00.000Z",
                },
            ],
        }));
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            value: { localStorage: storage },
            configurable: true,
            writable: true,
        });
        const loaded = (0, storage_1.loadJobHunterStore)();
        assert.ok(loaded.applicationsById["job-1"]);
        assert.equal(loaded.applications.length, 1);
        assert.deepEqual(loaded.automation, discoveryAutomation_1.DEFAULT_AUTOMATION_SETTINGS);
        Object.defineProperty(globalThis, "window", {
            value: previousWindow,
            configurable: true,
            writable: true,
        });
    });
    (0, node_test_1.it)("hydrates legacy applications without checklist fields", () => {
        const storage = new MemoryStorage();
        storage.setItem(storage_1.JOB_HUNTER_STORAGE_KEY, JSON.stringify({
            jobsById: {},
            jobs: [],
            applicationsById: {
                "job-legacy": {
                    id: "job-legacy",
                    jobId: "job-legacy",
                    status: "prepared",
                    notes: "legacy note",
                    createdAt: "2024-03-01T10:00:00.000Z",
                    updatedAt: "2024-03-01T10:00:00.000Z",
                },
            },
        }));
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            value: { localStorage: storage },
            configurable: true,
            writable: true,
        });
        const loaded = (0, storage_1.loadJobHunterStore)();
        assert.equal(loaded.applicationsById["job-legacy"].notes, "legacy note");
        assert.equal(loaded.applicationsById["job-legacy"].checklist?.resumeReviewed, false);
        assert.equal(loaded.applicationsById["job-legacy"].checklist?.followUpScheduled, false);
        assert.equal(loaded.applicationsById["job-legacy"].workflow?.selectedForApply, false);
        Object.defineProperty(globalThis, "window", {
            value: previousWindow,
            configurable: true,
            writable: true,
        });
    });
    (0, node_test_1.it)("persists guided apply workflow state", () => {
        const storage = new MemoryStorage();
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            value: { localStorage: storage },
            configurable: true,
            writable: true,
        });
        (0, storage_1.saveJobHunterStore)({
            jobs: [],
            jobsById: {},
            applications: [
                {
                    id: "job-22",
                    jobId: "job-22",
                    status: "prepared",
                    checklist: {
                        resumeReviewed: false,
                        coverLetterReviewed: false,
                        screenerAnswersReviewed: false,
                        appliedExternally: false,
                        followUpScheduled: false,
                    },
                    workflow: {
                        selectedForApply: true,
                        tailoredResumeReady: true,
                        coverLetterReady: true,
                        screenerAnswersReady: true,
                        externalApplicationOpened: true,
                        tailoredResumeUploaded: true,
                        customQuestionsCompleted: false,
                        finalExternalSubmitConfirmed: false,
                        followUpScheduled: false,
                    },
                    createdAt: "2024-03-01T10:00:00.000Z",
                    updatedAt: "2024-03-01T10:00:00.000Z",
                },
            ],
            applicationsById: {
                "job-22": {
                    id: "job-22",
                    jobId: "job-22",
                    status: "prepared",
                    checklist: {
                        resumeReviewed: false,
                        coverLetterReviewed: false,
                        screenerAnswersReviewed: false,
                        appliedExternally: false,
                        followUpScheduled: false,
                    },
                    workflow: {
                        selectedForApply: true,
                        tailoredResumeReady: true,
                        coverLetterReady: true,
                        screenerAnswersReady: true,
                        externalApplicationOpened: true,
                        tailoredResumeUploaded: true,
                        customQuestionsCompleted: false,
                        finalExternalSubmitConfirmed: false,
                        followUpScheduled: false,
                    },
                    createdAt: "2024-03-01T10:00:00.000Z",
                    updatedAt: "2024-03-01T10:00:00.000Z",
                },
            },
            selectedJobIds: [],
            sources: [],
        });
        const loaded = (0, storage_1.loadJobHunterStore)();
        assert.equal(loaded.applicationsById["job-22"].workflow?.externalApplicationOpened, true);
        assert.equal(loaded.applicationsById["job-22"].workflow?.tailoredResumeUploaded, true);
        Object.defineProperty(globalThis, "window", {
            value: previousWindow,
            configurable: true,
            writable: true,
        });
    });
    (0, node_test_1.it)("validates source payloads", () => {
        assert.equal((0, storage_1.isValidJobSourceConfig)({ company: "Acme", boardType: "greenhouse", boardToken: "acme" }), true);
        assert.equal((0, storage_1.isValidJobSourceConfig)({ company: "Acme", boardType: "ashby", boardToken: "acme" }), true);
        assert.equal((0, storage_1.isValidJobSourceConfig)({ company: "Acme", boardType: "smartrecruiters", boardToken: "acme" }), true);
        assert.equal((0, storage_1.isValidJobSourceConfig)({ company: "", boardType: "greenhouse", boardToken: "acme" }), false);
        assert.equal((0, storage_1.isValidJobSourceConfig)({ company: "Acme", boardType: "invalid", boardToken: "acme" }), false);
        assert.deepEqual((0, storage_1.validateJobSources)([{ company: " Acme ", boardType: "lever", boardToken: " acme " }, { nope: true }]), [
            { company: "Acme", boardType: "lever", boardToken: "acme" },
        ]);
    });
    (0, node_test_1.it)("round-trips sources through local storage", () => {
        const storage = new MemoryStorage();
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            value: { localStorage: storage },
            configurable: true,
            writable: true,
        });
        (0, storage_1.saveJobHunterStore)({
            jobs: [],
            jobsById: {},
            applications: [],
            applicationsById: {},
            selectedJobIds: ["job-1"],
            sources: [{ company: "Acme", boardType: "greenhouse", boardToken: "acme" }],
            resumeProfile: {
                fullName: "James Wang",
                email: "james@example.com",
                phone: "555-0101",
                cityState: "Austin, TX",
                linkedinUrl: "https://linkedin.com/in/james",
                websiteUrl: "",
                workAuthorizationNote: "US Citizen",
                signatureLine: "Best regards,",
                headline: "Staff Engineer",
                summary: "Summary",
                skills: ["Architecture"],
                experience: [{ company: "Acme", title: "SA", bullets: ["Led implementation"] }],
                achievements: ["Improved win rates"],
            },
        });
        const loaded = (0, storage_1.loadJobHunterStore)();
        assert.equal(loaded.sources.length, 1);
        assert.deepEqual(loaded.sources[0], { company: "Acme", boardType: "greenhouse", boardToken: "acme" });
        assert.equal(loaded.resumeProfile?.summary, "Summary");
        assert.deepEqual(loaded.selectedJobIds, ["job-1"]);
        Object.defineProperty(globalThis, "window", {
            value: previousWindow,
            configurable: true,
            writable: true,
        });
    });
    (0, node_test_1.it)("round-trips normalized preferences through local storage", () => {
        const storage = new MemoryStorage();
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            value: { localStorage: storage },
            configurable: true,
            writable: true,
        });
        (0, storage_1.saveJobHunterStore)({
            jobs: [],
            jobsById: {},
            applications: [],
            applicationsById: {},
            selectedJobIds: [],
            sources: [],
            automation: {
                autoSyncOnJobsOpen: false,
                autoSyncIfOlderThanHours: 300,
                topMatchesLimit: 0,
            },
            preferences: {
                targetRoles: ["  Solutions Architect  ", ""],
                targetKeywords: ["AWS"],
                targetLocations: [" Remote "],
                remoteOnly: true,
                preferredRemoteRegions: [" US "],
                preferredHybridLocations: [" Philadelphia "],
                allowRemoteRoles: true,
                allowHybridRoles: true,
                allowOnsiteRoles: true,
                excludedCompanies: ["  BadCo "],
                excludedTitles: [" Senior Manager "],
                minimumScore: 120,
            },
        });
        const loaded = (0, storage_1.loadJobHunterStore)();
        assert.deepEqual(loaded.preferences, {
            targetRoles: ["Solutions Architect"],
            targetKeywords: ["AWS"],
            targetLocations: ["Remote"],
            preferredRemoteRegions: ["US"],
            preferredHybridLocations: ["Philadelphia"],
            allowRemoteRoles: true,
            allowHybridRoles: true,
            allowOnsiteRoles: true,
            remoteOnly: true,
            excludedCompanies: ["BadCo"],
            excludedTitles: ["Senior Manager"],
            minimumScore: 100,
        });
        assert.deepEqual(loaded.automation, {
            autoSyncOnJobsOpen: false,
            autoSyncIfOlderThanHours: 168,
            topMatchesLimit: 1,
        });
        Object.defineProperty(globalThis, "window", {
            value: previousWindow,
            configurable: true,
            writable: true,
        });
    });
    (0, node_test_1.it)("seeds default preferences when missing from stored payload", () => {
        const storage = new MemoryStorage();
        storage.setItem(storage_1.JOB_HUNTER_STORAGE_KEY, JSON.stringify({
            jobsById: {},
            jobs: [],
            sources: [],
            applications: [],
            applicationsById: {},
        }));
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            value: { localStorage: storage },
            configurable: true,
            writable: true,
        });
        const loaded = (0, storage_1.loadJobHunterStore)();
        assert.deepEqual(loaded.preferences, (0, preferences_1.getDefaultPreferences)());
        assert.deepEqual(loaded.automation, discoveryAutomation_1.DEFAULT_AUTOMATION_SETTINGS);
        Object.defineProperty(globalThis, "window", {
            value: previousWindow,
            configurable: true,
            writable: true,
        });
    });
    (0, node_test_1.it)("migrates legacy remoteOnly preferences during hydration", () => {
        const storage = new MemoryStorage();
        storage.setItem(storage_1.JOB_HUNTER_STORAGE_KEY, JSON.stringify({
            jobsById: {},
            jobs: [],
            sources: [],
            applications: [],
            applicationsById: {},
            preferences: {
                targetRoles: ["Solutions Architect"],
                targetKeywords: [],
                targetLocations: ["Philadelphia"],
                remoteOnly: true,
                excludedCompanies: [],
                excludedTitles: [],
                minimumScore: 0,
            },
        }));
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            value: { localStorage: storage },
            configurable: true,
            writable: true,
        });
        const loaded = (0, storage_1.loadJobHunterStore)();
        assert.equal(loaded.preferences?.allowRemoteRoles, true);
        assert.equal(loaded.preferences?.allowHybridRoles, false);
        assert.equal(loaded.preferences?.allowOnsiteRoles, false);
        Object.defineProperty(globalThis, "window", {
            value: previousWindow,
            configurable: true,
            writable: true,
        });
    });
    (0, node_test_1.it)("hydrates selected queue safely", () => {
        const storage = new MemoryStorage();
        storage.setItem(storage_1.JOB_HUNTER_STORAGE_KEY, JSON.stringify({
            jobsById: {},
            jobs: [],
            selectedJobIds: ["job-1", "job-1", "", 42],
            sources: [],
            applications: [],
            applicationsById: {},
        }));
        const previousWindow = globalThis.window;
        Object.defineProperty(globalThis, "window", {
            value: { localStorage: storage },
            configurable: true,
            writable: true,
        });
        const loaded = (0, storage_1.loadJobHunterStore)();
        assert.deepEqual(loaded.selectedJobIds, ["job-1"]);
        Object.defineProperty(globalThis, "window", {
            value: previousWindow,
            configurable: true,
            writable: true,
        });
    });
    (0, node_test_1.it)("returns an empty source list for non-array payloads", () => {
        assert.deepEqual((0, storage_1.validateJobSources)(null), []);
        assert.deepEqual((0, storage_1.validateJobSources)({ company: "Acme" }), []);
    });
    (0, node_test_1.it)("supports settings helper validation and token display", () => {
        assert.equal((0, sourceSettings_1.truncateBoardToken)("abcdefghijklmno"), "abcd...lmno");
        assert.equal((0, sourceSettings_1.truncateBoardToken)("short"), "short");
        assert.equal((0, sourceSettings_1.getSourceValidationMessage)({ company: " ", boardType: "greenhouse", boardToken: "token" }, [{ company: "Acme", boardType: "greenhouse", boardToken: "token" }]), "Company and board token are required.");
        assert.equal((0, sourceSettings_1.getSourceValidationMessage)({ company: "Acme", boardType: "greenhouse", boardToken: " token " }, [{ company: "Acme", boardType: "greenhouse", boardToken: "token" }]), "That source already exists.");
    });
});
