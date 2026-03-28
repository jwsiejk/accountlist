"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const preferences_1 = require("./preferences");
const discoveryAutomation_1 = require("./discoveryAutomation");
const baseJob = {
    id: "job-1",
    title: "Solutions Architect",
    company: "Acme",
    location: "Remote - United States",
    source: "linkedin",
    createdAt: "2024-03-01T00:00:00.000Z",
    updatedAt: "2024-03-01T00:00:00.000Z",
    notes: "Partner cloud infrastructure workshops",
};
(0, node_test_1.describe)("job hunter discovery automation", () => {
    (0, node_test_1.it)("normalizes automation defaults", () => {
        assert.deepEqual((0, discoveryAutomation_1.normalizeAutomationSettings)(undefined), discoveryAutomation_1.DEFAULT_AUTOMATION_SETTINGS);
        assert.deepEqual((0, discoveryAutomation_1.normalizeAutomationSettings)({ autoSyncOnJobsOpen: false, autoSyncIfOlderThanHours: 500, topMatchesLimit: 0 }), {
            autoSyncOnJobsOpen: false,
            autoSyncIfOlderThanHours: 168,
            topMatchesLimit: 1,
        });
    });
    (0, node_test_1.it)("flags stale sync by timestamp age", () => {
        const nowMs = Date.parse("2024-03-02T00:00:00.000Z");
        assert.equal((0, discoveryAutomation_1.isSyncStale)(undefined, 24, nowMs), true);
        assert.equal((0, discoveryAutomation_1.isSyncStale)("2024-03-01T12:00:00.000Z", 24, nowMs), false);
        assert.equal((0, discoveryAutomation_1.isSyncStale)("2024-02-28T12:00:00.000Z", 24, nowMs), true);
    });
    (0, node_test_1.it)("checks auto-sync eligibility rules", () => {
        const automation = { autoSyncOnJobsOpen: true, autoSyncIfOlderThanHours: 24, topMatchesLimit: 10 };
        const nowMs = Date.parse("2024-03-02T00:00:00.000Z");
        assert.equal((0, discoveryAutomation_1.shouldAutoSyncOnJobsOpen)({ sourcesCount: 0, lastSyncedAt: undefined, automation, nowMs }), false);
        assert.equal((0, discoveryAutomation_1.shouldAutoSyncOnJobsOpen)({
            sourcesCount: 1,
            lastSyncedAt: "2024-03-01T20:00:00.000Z",
            automation,
            nowMs,
        }), false);
        assert.equal((0, discoveryAutomation_1.shouldAutoSyncOnJobsOpen)({ sourcesCount: 1, lastSyncedAt: undefined, automation, nowMs }), true);
    });
    (0, node_test_1.it)("derives top matches from ranked non-excluded jobs", () => {
        const preferences = (0, preferences_1.getDefaultPreferences)();
        const ranked = (0, discoveryAutomation_1.rankJobsForReview)([
            baseJob,
            { ...baseJob, id: "job-2", title: "Sales Engineer", updatedAt: "2024-03-03T00:00:00.000Z" },
            { ...baseJob, id: "job-3", company: "BadCo", updatedAt: "2024-03-02T00:00:00.000Z" },
        ], {
            ...preferences,
            excludedCompanies: ["badco"],
        });
        const topMatches = (0, discoveryAutomation_1.deriveTopMatchesReviewQueue)({ rankedJobs: ranked, topMatchesLimit: 2, minimumScore: 0 });
        assert.equal(topMatches.length, 2);
        assert.equal(topMatches.some((row) => row.job.id === "job-3"), false);
    });
    (0, node_test_1.it)("does not auto-select top matches into apply queue", () => {
        const ranked = (0, discoveryAutomation_1.rankJobsForReview)([baseJob], (0, preferences_1.getDefaultPreferences)());
        const topMatches = (0, discoveryAutomation_1.deriveTopMatchesReviewQueue)({ rankedJobs: ranked, topMatchesLimit: 1, minimumScore: 0 });
        assert.equal(topMatches.length, 1);
        const selectedJobIds = [];
        assert.equal(selectedJobIds.includes(topMatches[0].job.id), false);
    });
});
