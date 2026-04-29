import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateConversationDraftsFromTopJobs } from "./conversationAutomation";
import { getDefaultPreferences } from "./preferences";
import type { JobHunterStore, JobPosting } from "./types";

const makeJob = (id: string, title: string, notes = ""): JobPosting => ({
  id,
  title,
  company: `Company ${id}`,
  source: "manual",
  notes,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const baseStore = (jobs: JobPosting[]): JobHunterStore => ({
  jobs,
  jobsById: jobs.reduce<Record<string, JobPosting>>((acc, job) => ({ ...acc, [job.id]: job }), {}),
  selectedJobIds: [],
  sources: [],
  applications: [],
  applicationsById: {},
  preferences: getDefaultPreferences(),
  automation: { autoSyncOnJobsOpen: true, autoSyncIfOlderThanHours: 24, topMatchesLimit: 10 },
  conversations: [],
  conversationsById: {},
  conversationTargets: [],
  conversationTargetsById: {},
  conversationBriefs: [],
  conversationBriefsById: {},
  outreachSequences: [],
  outreachSequencesById: {},
});

describe("conversation automation", () => {
  it("generates briefs, targets, and drafts for high-scoring jobs only", () => {
    const strong = makeJob("job-1", "Solutions Architect", "cloud architecture kubernetes distributed systems");
    const weak = makeJob("job-2", "Office Coordinator", "office admin");
    const { store, summary } = generateConversationDraftsFromTopJobs({
      store: baseStore([strong, weak]),
      now: new Date("2026-01-02T00:00:00.000Z"),
      minimumScore: 60,
    });

    assert.equal(summary.eligibleJobs, 1);
    assert.equal(summary.generatedBriefs, 1);
    assert.equal(summary.generatedTargets, 2);
    assert.equal(summary.generatedOutreachDrafts >= 1, true);
    assert.equal(store.conversationBriefs.length, 1);
  });

  it("does not duplicate previously generated records", () => {
    const strong = makeJob("job-1", "Solutions Architect", "cloud architecture kubernetes distributed systems");
    const first = generateConversationDraftsFromTopJobs({
      store: baseStore([strong]),
      now: new Date("2026-01-02T00:00:00.000Z"),
      minimumScore: 60,
    });
    const second = generateConversationDraftsFromTopJobs({
      store: first.store,
      now: new Date("2026-01-03T00:00:00.000Z"),
      minimumScore: 60,
    });

    assert.equal(second.summary.generatedBriefs, 0);
    assert.equal(second.summary.generatedTargets, 0);
    assert.equal(second.summary.generatedOutreachDrafts, 0);
  });
});
