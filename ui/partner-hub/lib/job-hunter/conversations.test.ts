import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildConversationBriefForJob, buildInitialOutreachQueueForJob, buildOutreachDraft, getTodaysConversationActions, normalizeConversationTarget } from "./conversations";
import type { JobPosting, OutreachSequence } from "./types";

const job: JobPosting = { id: "job-1", title: "Staff Engineer", company: "Acme", source: "manual", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

describe("conversations engine", () => {
  it("normalization clamps confidence", () => {
    const target = normalizeConversationTarget({ id: "t1", company: "Acme", name: "A", relationshipType: "recruiter", source: "manual", confidence: 123, createdAt: "x", updatedAt: "x" });
    assert.equal(target.confidence, 100);
  });

  it("fit-driven brief generation", () => {
    const { brief } = buildConversationBriefForJob(job, { matched: ["System design"], missing: ["Domain depth"], preferenceSignals: ["Remote-first"] }, undefined, new Date("2026-01-05T00:00:00.000Z"));
    assert.deepEqual(brief.likelyHiringPriorities, ["System design"]);
    assert.deepEqual(brief.likelyPainPoints, ["Domain depth"]);
    assert.deepEqual(brief.proofPoints, ["Remote-first"]);
  });

  it("manual channel fallback and no duplicate outreach", () => {
    const now = new Date("2026-01-05T00:00:00.000Z");
    const { brief, targets } = buildConversationBriefForJob(job, undefined, undefined, now);
    const forcedManual = { ...targets[0], profileUrl: undefined, email: undefined };
    const existing: OutreachSequence[] = [buildOutreachDraft({ job, brief, target: targets[1], channel: "manual", stage: "intro", now })];
    const queue = buildInitialOutreachQueueForJob({ job, brief, targets: [forcedManual, targets[1]], existing, now });
    assert.equal(queue[0].channel, "manual");
    assert.equal(queue.length, 1);
  });

  it("dueAt follow-up behavior and roles needing targets", () => {
    const now = new Date("2026-01-12T00:00:00.000Z");
    const { brief, targets } = buildConversationBriefForJob(job, undefined, undefined, now);
    const draft = buildOutreachDraft({ job, brief, target: targets[0], channel: "manual", stage: "follow_up_1", now });
    const queued = { ...draft, id: "q1", status: "queued" as const };
    const sent = { ...draft, id: "s1", status: "sent" as const, sentAt: "2026-01-01T00:00:00.000Z" };
    const skipped = { ...draft, id: "k1", status: "skipped" as const };
    const actions = getTodaysConversationActions({ today: now, sequences: [queued, sent, skipped], targets, jobs: [job, { ...job, id: "job-2", company: "Beta" }] });
    assert.equal(actions.followUpsDue.length >= 1, true);
    assert.equal(actions.staleSentNoReply.length, 1);
    assert.equal(actions.rolesNeedingTargets.length, 1);
  });
});
