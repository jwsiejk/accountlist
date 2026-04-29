import assert from "node:assert/strict";
import test from "node:test";

import { calculateConversationDailyProgress, calculateConversationExecutionMetrics, getDefaultConversationDailyQuota } from "./conversationMetrics";
import type { OutreachSequence } from "./types";

const now = new Date("2026-04-29T12:00:00.000Z");

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
  assert.deepEqual(getDefaultConversationDailyQuota(), { newOutreach: 8, followUps: 5 });
});

test("calculates execution metrics for today", () => {
  const metrics = calculateConversationExecutionMetrics({
    now,
    sequences: [
      seq("intro-sent", { status: "sent", sentAt: "2026-04-29T05:00:00.000Z" }),
      seq("follow-sent", { stage: "follow_up_1", status: "sent", sentAt: "2026-04-29T06:00:00.000Z" }),
      seq("reply-today", { status: "replied", repliedAt: "2026-04-29T07:00:00.000Z" }),
      seq("reply-old", { status: "replied", repliedAt: "2026-04-20T07:00:00.000Z" }),
      seq("stale", { status: "sent", sentAt: "2026-04-20T00:00:00.000Z" }),
      seq("fresh-sent", { status: "sent", sentAt: "2026-04-27T00:00:00.000Z" }),
    ],
  });

  assert.equal(metrics.newOutreachSentToday, 1);
  assert.equal(metrics.followUpsSentToday, 1);
  assert.equal(metrics.repliesToday, 1);
  assert.equal(metrics.activeConversations, 2);
  assert.equal(metrics.staleSentNoReply, 1);
});

test("caps daily progress at 100 percent", () => {
  const progress = calculateConversationDailyProgress({
    metrics: {
      newOutreachSentToday: 10,
      followUpsSentToday: 8,
      repliesToday: 0,
      activeConversations: 0,
      staleSentNoReply: 0,
    },
  });
  assert.equal(progress, 100);
});
