import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateConversationAssetsForJobs, generateConversationDraftsFromTopJobs, shouldGenerateConversationForJob } from "./conversationAutomation";
import { rankJobsForReview } from "./discoveryAutomation";
import { getDefaultPreferences } from "./preferences";
import type { ConversationTarget, JobHunterStore, JobPosting } from "./types";

const makeJob = (id: string, title: string, notes = "", company = `Company ${id}`): JobPosting => ({
  id,
  title,
  company,
  source: "manual",
  notes,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const baseStore = (jobs: JobPosting[], targets: ConversationTarget[] = []): JobHunterStore => ({
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
  conversationTargets: targets,
  conversationTargetsById: targets.reduce<Record<string, ConversationTarget>>((acc, target) => ({ ...acc, [target.id]: target }), {}),
  conversationBriefs: [],
  conversationBriefsById: {},
  outreachSequences: [],
  outreachSequencesById: {},
});

describe("conversation automation", () => {
  it("generates briefs, targets, and drafts for high-scoring jobs only", () => {
    const strong = makeJob("job-1", "Solutions Architect", "cloud architecture kubernetes distributed systems");
    const weak = makeJob("job-2", "Office Coordinator", "office admin");
    const { store, summary } = generateConversationDraftsFromTopJobs({ store: baseStore([strong, weak]), now: new Date("2026-01-02T00:00:00.000Z"), minimumScore: 60 });

    assert.equal(summary.eligibleJobs, 1);
    assert.equal(summary.generatedBriefs, 1);
    assert.equal(summary.generatedTargets, 2);
    assert.equal(summary.generatedOutreachDrafts >= 1, true);
    assert.equal(store.conversationBriefs.length, 1);
  });

  it("uses existing company targets with case-insensitive trimmed company matching", () => {
    const job = makeJob("job-1", "Solutions Architect", "cloud distributed systems", "Acme");
    const existingTarget: ConversationTarget = {
      id: "acme:employee-1", company: " acme ", name: "Pat Engineer", relationshipType: "employee", source: "manual", confidence: 95,
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const { assets, summary } = generateConversationAssetsForJobs({ store: baseStore([job], [existingTarget]), now: new Date("2026-01-02T00:00:00.000Z"), minimumScore: 60, topMatchesLimit: 5 });

    assert.equal(summary.generatedTargets, 0);
    assert.equal(Object.values(assets.targetsById).length, 0);
    assert.equal(Object.values(assets.targetsById).some((target) => target.id.includes("auto-")), false);
    assert.equal(Object.values(assets.sequencesById).every((s) => s.contactId === existingTarget.id), true);
  });

  it("creates placeholder targets even when brief already exists but targets do not", () => {
    const job = makeJob("job-1", "Solutions Architect", "cloud distributed systems", "Acme");
    const store = baseStore([job]);
    store.conversationBriefsById["b1"] = { id: "b1", jobId: job.id, company: "Acme", roleTitle: job.title, reasonToPursue: "x", likelyHiringPriorities: ["a"], likelyPainPoints: ["b"], candidateFit: ["c"], riskAreas: ["d"], messageAngle: "e", proofPoints: [], recommendedTargets: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    const { store: out } = generateConversationDraftsFromTopJobs({ store, now: new Date("2026-01-02T00:00:00.000Z"), minimumScore: 60 });

    assert.ok(out.conversationTargetsById["job-1:auto-recruiter"]);
    assert.ok(out.conversationTargetsById["job-1:auto-hiring-manager"]);
    assert.equal(out.outreachSequences.length >= 1, true);
  });

  it("respects exclusions via ranked review queue", () => {
    const preferences = { ...getDefaultPreferences(), excludedCompanies: ["Blocked Corp"] };
    const blocked = makeJob("job-1", "Solutions Architect", "cloud distributed systems", "Blocked Corp");
    const rankedJobs = rankJobsForReview([blocked], preferences);
    assert.equal(shouldGenerateConversationForJob({ jobId: blocked.id, rankedJobs, minimumScore: 0, topMatchesLimit: 5 }), false);
  });
});
