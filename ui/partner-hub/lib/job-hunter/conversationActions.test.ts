import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyConversationActions } from "./conversationActions";
import { getTodaysConversationActions } from "./conversations";
import type { ConversationTarget, JobPosting, OutreachSequence } from "./types";

const today = new Date("2026-04-29T12:00:00.000Z");

const job: JobPosting = { id: "job-1", title: "Staff Engineer", company: "Acme", source: "manual", createdAt: today.toISOString(), updatedAt: today.toISOString() };
const target: ConversationTarget = { id: "target-1", company: "Acme", name: "Taylor", relationshipType: "recruiter", source: "manual", confidence: 80, createdAt: today.toISOString(), updatedAt: today.toISOString() };
const seq = (overrides: Partial<OutreachSequence>): OutreachSequence => ({ id: "job-1:target-1:intro:linkedin", jobId: job.id, contactId: target.id, stage: "intro", channel: "linkedin", generatedMessage: "hello", status: "draft", createdAt: today.toISOString(), updatedAt: today.toISOString(), ...overrides });

test("prioritizes action types in required order", () => {
  const jobs = [job, { ...job, id: "job-2", company: "Beta", title: "Manager" }];
  const targets = [target];
  const sequences = [
      seq({ id: "follow", stage: "follow_up_1", dueAt: "2026-04-29T00:00:00.000Z" }),
      seq({ id: "reply", status: "replied" }),
      seq({ id: "draft", stage: "intro", status: "draft" }),
      seq({ id: "stale", status: "sent", sentAt: "2026-04-20T00:00:00.000Z" }),
    ];
  const actions = buildDailyConversationActions({
    jobsById: Object.fromEntries(jobs.map((j) => [j.id, j])),
    targetsById: Object.fromEntries(targets.map((t) => [t.id, t])),
    actions: getTodaysConversationActions({ today, jobs, targets, sequences }),
  });

  assert.deepEqual(actions.map((a) => a.type), ["send_follow_up", "review_reply", "send_draft", "add_target", "review_stale_sent"]);
  assert.equal(actions[0]?.priority, "high");
});

test("limits to top 10 actions by default", () => {
  const sequences = Array.from({ length: 20 }, (_, index) => seq({ id: `f-${index}`, stage: "follow_up_1", dueAt: "2026-04-29T00:00:00.000Z" }));
  const jobs = [job];
  const targets = [target];
  const actions = buildDailyConversationActions({
    jobsById: Object.fromEntries(jobs.map((j) => [j.id, j])),
    targetsById: Object.fromEntries(targets.map((t) => [t.id, t])),
    actions: getTodaysConversationActions({ today, jobs, targets, sequences }),
  });
  assert.equal(actions.length, 10);
  assert.ok(actions.every((a) => a.type === "send_follow_up"));
});

test("includes context and guidance fields", () => {
  const jobs = [job, { ...job, id: "job-2", company: "NoTarget", title: "Dev" }];
  const targets = [target];
  const sequences = [seq({ id: "draft", generatedMessage: "message preview" })];
  const actions = buildDailyConversationActions({
    jobsById: Object.fromEntries(jobs.map((j) => [j.id, j])),
    targetsById: Object.fromEntries(targets.map((t) => [t.id, t])),
    actions: getTodaysConversationActions({ today, jobs, targets, sequences }),
  });
  const draftAction = actions.find((action) => action.type === "send_draft");
  const addTargetAction = actions.find((action) => action.type === "add_target");
  assert.equal(draftAction?.company, "Acme");
  assert.equal(draftAction?.roleTitle, "Staff Engineer");
  assert.equal(draftAction?.contactName, "Taylor");
  assert.equal(draftAction?.messagePreview, "message preview");
  assert.deepEqual(draftAction?.supportedActions, ["edit", "copy", "mark_sent", "skip"]);
  assert.equal(addTargetAction?.guide, "roles_needing_targets");
});
