import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addBusinessDays, buildConversationBriefForJob, buildInitialOutreachQueueForJob, buildOutreachDraft, getTodaysConversationActions, isBusinessDay, normalizeConversationTarget, scheduleNextFollowUp } from "./conversations";
import type { JobPosting, OutreachSequence } from "./types";

const job: JobPosting = { id: "job-1", title: "Staff Engineer", company: "Acme", source: "manual", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

describe("conversations engine", () => {
  it("normalization clamps confidence", () => {
    const target = normalizeConversationTarget({ id: "t1", jobId: "j", company: "Acme", relationship: "recruiter", confidence: 123, createdAt: "x", updatedAt: "x" });
    assert.equal(target.confidence, 100);
  });

  it("builds brief with default targets", () => {
    const { brief, targets } = buildConversationBriefForJob(job, new Date("2026-01-05T00:00:00.000Z"));
    assert.equal(targets.some((t) => t.relationship === "recruiter"), true);
    assert.equal(targets.some((t) => t.relationship === "hiring_manager"), true);
    assert.equal(brief.reasonToPursue.length > 0, true);
  });

  it("avoids duplicates in initial queue", () => {
    const now = new Date("2026-01-05T00:00:00.000Z");
    const { brief, targets } = buildConversationBriefForJob(job, now);
    const existing: OutreachSequence[] = [{ ...buildOutreachDraft({ job, brief, target: targets[0], channel: "email", stage: "intro", now }), id: `${job.id}:${targets[0].id}:intro:email` }];
    const queue = buildInitialOutreachQueueForJob({ job, brief, targets, existing, now });
    assert.equal(queue.length, 1);
  });

  it("enforces message limits and banned phrases", () => {
    const now = new Date("2026-01-05T00:00:00.000Z");
    const { brief, targets } = buildConversationBriefForJob({ ...job, title: "A".repeat(1000) }, now);
    const linkedInDraft = buildOutreachDraft({ job: { ...job, title: "A".repeat(1000) }, brief, target: targets[0], channel: "linkedin", stage: "intro", now });
    assert.equal(linkedInDraft.message.length <= 600, true);
    assert.equal(/synergize|circle back|rockstar|guru|i am extremely passionate/i.test(linkedInDraft.message), false);
  });

  it("skips weekends and chains followups", () => {
    const friday = new Date("2026-01-09T00:00:00.000Z");
    const next = addBusinessDays(friday, 1);
    assert.equal(isBusinessDay(next), true);
    assert.equal(next.getUTCDay(), 1);

    const { brief, targets } = buildConversationBriefForJob(job, friday);
    const intro = buildOutreachDraft({ job, brief, target: targets[0], channel: "email", stage: "intro", now: friday });
    const follow1 = scheduleNextFollowUp(intro, friday);
    assert.equal(follow1?.stage, "follow_up_1");
    const follow2 = scheduleNextFollowUp(follow1!, friday);
    assert.equal(follow2?.stage, "follow_up_2");
  });

  it("returns today's actions", () => {
    const now = new Date("2026-01-12T00:00:00.000Z");
    const { brief, targets } = buildConversationBriefForJob(job, now);
    const draft = buildOutreachDraft({ job, brief, target: targets[0], channel: "email", stage: "follow_up_1", now });
    const sent = { ...draft, id: "sent-1", status: "sent" as const, sentAt: "2026-01-01T00:00:00.000Z" };
    const replied = { ...draft, id: "reply-1", status: "replied" as const, repliedAt: "2026-01-10T00:00:00.000Z" };
    const actions = getTodaysConversationActions({ today: now, sequences: [draft, sent, replied], targets, jobs: [job, { ...job, id: "job-2" }] });
    assert.equal(actions.draftsToReview.length >= 1, true);
    assert.equal(actions.followUpsDue.length >= 1, true);
    assert.equal(actions.staleSentNoReply.length, 1);
    assert.equal(actions.activeReplies.length, 1);
    assert.equal(actions.rolesNeedingTargets.length, 1);
  });
});
