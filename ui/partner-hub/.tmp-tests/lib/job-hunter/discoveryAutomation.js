"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveTopMatchesReviewQueue = exports.rankJobsForReview = exports.shouldAutoSyncOnJobsOpen = exports.isSyncStale = exports.normalizeAutomationSettings = exports.DEFAULT_AUTOMATION_SETTINGS = void 0;
const preferences_1 = require("./preferences");
const scoring_1 = require("./scoring");
exports.DEFAULT_AUTOMATION_SETTINGS = {
    autoSyncOnJobsOpen: true,
    autoSyncIfOlderThanHours: 24,
    topMatchesLimit: 10,
};
const clampInt = (value, fallback, min, max) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(min, Math.min(max, Math.round(value)));
};
const normalizeAutomationSettings = (input) => ({
    autoSyncOnJobsOpen: typeof input?.autoSyncOnJobsOpen === "boolean"
        ? input.autoSyncOnJobsOpen
        : exports.DEFAULT_AUTOMATION_SETTINGS.autoSyncOnJobsOpen,
    autoSyncIfOlderThanHours: clampInt(input?.autoSyncIfOlderThanHours, exports.DEFAULT_AUTOMATION_SETTINGS.autoSyncIfOlderThanHours, 1, 168),
    topMatchesLimit: clampInt(input?.topMatchesLimit, exports.DEFAULT_AUTOMATION_SETTINGS.topMatchesLimit, 1, 50),
});
exports.normalizeAutomationSettings = normalizeAutomationSettings;
const isSyncStale = (lastSyncedAt, staleAfterHours, nowMs = Date.now()) => {
    if (!lastSyncedAt) {
        return true;
    }
    const syncedAtMs = Date.parse(lastSyncedAt);
    if (!Number.isFinite(syncedAtMs)) {
        return true;
    }
    return nowMs - syncedAtMs >= staleAfterHours * 60 * 60 * 1000;
};
exports.isSyncStale = isSyncStale;
const shouldAutoSyncOnJobsOpen = ({ sourcesCount, lastSyncedAt, automation, nowMs, }) => {
    if (sourcesCount <= 0 || !automation.autoSyncOnJobsOpen) {
        return false;
    }
    return (0, exports.isSyncStale)(lastSyncedAt, automation.autoSyncIfOlderThanHours, nowMs);
};
exports.shouldAutoSyncOnJobsOpen = shouldAutoSyncOnJobsOpen;
const rankJobsForReview = (jobs, preferences) => jobs
    .map((job) => {
    const fit = (0, scoring_1.scoreJobFit)(job, preferences);
    const exclusion = (0, preferences_1.jobMatchesPreferences)(job, preferences);
    return {
        job,
        score: fit.score,
        excluded: exclusion.excluded,
        exclusionReasons: exclusion.reasons,
        arrangement: exclusion.arrangement,
        reasonSummary: (0, scoring_1.summarizeJobReason)({
            excluded: exclusion.excluded,
            exclusionReasons: exclusion.reasons,
            preferenceSignals: fit.preferenceSignals,
        }),
    };
})
    .sort((a, b) => {
    if (b.score !== a.score) {
        return b.score - a.score;
    }
    return b.job.updatedAt.localeCompare(a.job.updatedAt);
});
exports.rankJobsForReview = rankJobsForReview;
const deriveTopMatchesReviewQueue = ({ rankedJobs, topMatchesLimit, minimumScore, }) => rankedJobs
    .filter((row) => !row.excluded && row.score >= Math.max(0, Math.min(100, minimumScore)))
    .slice(0, Math.max(1, topMatchesLimit));
exports.deriveTopMatchesReviewQueue = deriveTopMatchesReviewQueue;
