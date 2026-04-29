import assert from "node:assert/strict";
import test from "node:test";

import { calculateConversationDailyProgress, calculateConversationExecutionMetrics, getDefaultConversationDailyQuota } from "./conversationMetrics";
import type { OutreachSequence } from "./types";

const today = new Date("2026-04-29T12:00:00.000Z");

const seq = (id: string, overrides: Partial<OutreachSequence>): OutreachSequence => ({
  id,
  jobId: "job-1",
  contactId: "target-1",
  stage: "intro",
  channel: "linkedin",
  generatedMessage: "hello",
  status: "draft",
  createdAt: "2026-04-28T00:00:00.000Z",
  updatedAt: "2026-04-28T00:00:00.000Z",
  ...overrides,
});

test("returns default daily quota", () => {
  assert.deepEqual(getDefaultConversationDailyQuota(), { newOutreachTarget: 8, followUpTarget: 5 });
});

test("calculates execution metrics for today window", () => {
  const metrics = calculateConversationExecutionMetrics({
    today,
    window: "today",
    sequences: [
      seq("intro-sent", { status: "sent", sentAt: "2026-04-29T05:00:00.000Z" }),
      seq("follow-sent", { stage: "follow_up_1", status: "sent", sentAt: "2026-04-29T06:00:00.000Z" }),
      seq("reply-today", { status: "replied", repliedAt: "2026-04-29T07:00:00.000Z" }),
      seq("skipped", { status: "skipped" }),
      seq("stale", { status: "sent", sentAt: "2026-04-20T00:00:00.000Z" }),
    ],
  });

  assert.equal(metrics.window, "today");
  assert.equal(metrics.newOutreachSent, 1);
  assert.equal(metrics.followUpsSent, 1);
  assert.equal(metrics.skipped, 1);
  assert.equal(metrics.replies, 1);
  assert.equal(metrics.activeConversations, 1);
  assert.equal(metrics.staleSentNoReply, 1);
});

test("calculates execution metrics for last7Days window", () => {
  const metrics = calculateConversationExecutionMetrics({
    today,
    window: "last7Days",
    sequences: [
      seq("intro-in-window", { status: "sent", sentAt: "2026-04-23T11:00:00.000Z" }),
      seq("follow-in-window", { stage: "follow_up_2", status: "sent", sentAt: "2026-04-28T06:00:00.000Z" }),
      seq("reply-in-window", { status: "replied", repliedAt: "2026-04-24T06:00:00.000Z" }),
      seq("reply-out-window", { status: "replied", repliedAt: "2026-04-20T06:00:00.000Z" }),
    ],
  });

  assert.equal(metrics.newOutreachSent, 1);
  assert.equal(metrics.followUpsSent, 1);
  assert.equal(metrics.replies, 1);
});

test("calculates execution metrics for allTime window", () => {
  const metrics = calculateConversationExecutionMetrics({
    today,
    window: "allTime",
    sequences: [
      seq("intro", { status: "sent", sentAt: "2026-04-01T05:00:00.000Z" }),
      seq("follow", { stage: "follow_up_1", status: "sent", sentAt: "2026-04-02T06:00:00.000Z" }),
      seq("reply", { status: "replied", repliedAt: "2026-04-03T07:00:00.000Z" }),
    ],
  });

  assert.equal(metrics.newOutreachSent, 1);
  assert.equal(metrics.followUpsSent, 1);
  assert.equal(metrics.replies, 1);
});

test("handles invalid or missing dates safely", () => {
  const metrics = calculateConversationExecutionMetrics({
    today,
    window: "today",
    sequences: [
      seq("missing", { status: "sent" }),
      seq("invalid", { status: "sent", sentAt: "not-a-date" }),
      seq("invalid-reply", { status: "replied", repliedAt: "not-a-date" }),
    ],
  });

  assert.equal(metrics.newOutreachSent, 0);
  assert.equal(metrics.followUpsSent, 0);
  assert.equal(metrics.replies, 0);
});

test("returns structured daily progress with clamping and remaining counts", () => {
  const progress = calculateConversationDailyProgress({
    metrics: {
      window: "today",
      newOutreachSent: 10,
      followUpsSent: 8,
      skipped: 0,
      replies: 0,
      activeConversations: 0,
      staleSentNoReply: 0,
    },
    quota: { newOutreachTarget: 8, followUpTarget: 5 },
  });

  assert.equal(progress.totalCompleted, 18);
  assert.equal(progress.totalTarget, 13);
  assert.equal(progress.progressPct, 100);
  assert.equal(progress.remainingNewOutreach, 0);
  assert.equal(progress.remainingFollowUps, 0);
});
