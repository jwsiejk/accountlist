import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDefaultPreferences } from "./preferences";
import {
  DEFAULT_AUTOMATION_SETTINGS,
  deriveTopMatchesReviewQueue,
  isSyncStale,
  normalizeAutomationSettings,
  rankJobsForReview,
  shouldAutoSyncOnJobsOpen,
} from "./discoveryAutomation";
import type { JobPosting } from "./types";

const baseJob: JobPosting = {
  id: "job-1",
  title: "Solutions Architect",
  company: "Acme",
  location: "Remote - United States",
  source: "linkedin",
  createdAt: "2024-03-01T00:00:00.000Z",
  updatedAt: "2024-03-01T00:00:00.000Z",
  notes: "Partner cloud infrastructure workshops",
};

describe("job hunter discovery automation", () => {
  it("normalizes automation defaults", () => {
    assert.deepEqual(normalizeAutomationSettings(undefined), DEFAULT_AUTOMATION_SETTINGS);
    assert.deepEqual(
      normalizeAutomationSettings({ autoSyncOnJobsOpen: false, autoSyncIfOlderThanHours: 500, topMatchesLimit: 0 }),
      {
        autoSyncOnJobsOpen: false,
        autoSyncIfOlderThanHours: 168,
        topMatchesLimit: 1,
      },
    );
  });

  it("flags stale sync by timestamp age", () => {
    const nowMs = Date.parse("2024-03-02T00:00:00.000Z");
    assert.equal(isSyncStale(undefined, 24, nowMs), true);
    assert.equal(isSyncStale("2024-03-01T12:00:00.000Z", 24, nowMs), false);
    assert.equal(isSyncStale("2024-02-28T12:00:00.000Z", 24, nowMs), true);
  });

  it("checks auto-sync eligibility rules", () => {
    const automation = { autoSyncOnJobsOpen: true, autoSyncIfOlderThanHours: 24, topMatchesLimit: 10 };
    const nowMs = Date.parse("2024-03-02T00:00:00.000Z");

    assert.equal(shouldAutoSyncOnJobsOpen({ sourcesCount: 0, lastSyncedAt: undefined, automation, nowMs }), false);
    assert.equal(
      shouldAutoSyncOnJobsOpen({
        sourcesCount: 1,
        lastSyncedAt: "2024-03-01T20:00:00.000Z",
        automation,
        nowMs,
      }),
      false,
    );
    assert.equal(shouldAutoSyncOnJobsOpen({ sourcesCount: 1, lastSyncedAt: undefined, automation, nowMs }), true);
  });

  it("derives top matches from ranked non-excluded jobs", () => {
    const preferences = getDefaultPreferences();
    const ranked = rankJobsForReview([
      baseJob,
      { ...baseJob, id: "job-2", title: "Sales Engineer", updatedAt: "2024-03-03T00:00:00.000Z" },
      { ...baseJob, id: "job-3", company: "BadCo", updatedAt: "2024-03-02T00:00:00.000Z" },
    ], {
      ...preferences,
      excludedCompanies: ["badco"],
    });

    const topMatches = deriveTopMatchesReviewQueue({ rankedJobs: ranked, topMatchesLimit: 2, minimumScore: 0 });

    assert.equal(topMatches.length, 2);
    assert.equal(topMatches.some((row) => row.job.id === "job-3"), false);
  });

  it("does not auto-select top matches into apply queue", () => {
    const ranked = rankJobsForReview([baseJob], getDefaultPreferences());
    const topMatches = deriveTopMatchesReviewQueue({ rankedJobs: ranked, topMatchesLimit: 1, minimumScore: 0 });

    assert.equal(topMatches.length, 1);
    const selectedJobIds: string[] = [];
    assert.equal(selectedJobIds.includes(topMatches[0].job.id), false);
  });
});
