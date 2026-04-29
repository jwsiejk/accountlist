import type { OutreachSequence } from "./types";

export type ConversationDailyQuota = {
  newOutreach: number;
  followUps: number;
};

export type ConversationExecutionMetrics = {
  newOutreachSentToday: number;
  followUpsSentToday: number;
  repliesToday: number;
  activeConversations: number;
  staleSentNoReply: number;
};

const ONE_DAY_MS = 86_400_000;

const isSameUtcDay = (left: Date, right: Date) => left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);

export const getDefaultConversationDailyQuota = (): ConversationDailyQuota => ({
  newOutreach: 8,
  followUps: 5,
});

export const calculateConversationExecutionMetrics = (params: { now: Date; sequences: OutreachSequence[] }): ConversationExecutionMetrics => {
  const { now, sequences } = params;
  const metrics: ConversationExecutionMetrics = {
    newOutreachSentToday: 0,
    followUpsSentToday: 0,
    repliesToday: 0,
    activeConversations: 0,
    staleSentNoReply: 0,
  };

  for (const sequence of sequences) {
    const sentAt = sequence.sentAt ? new Date(sequence.sentAt) : null;
    const repliedAt = sequence.repliedAt ? new Date(sequence.repliedAt) : null;

    if (sentAt && isSameUtcDay(sentAt, now)) {
      if (sequence.stage === "intro") metrics.newOutreachSentToday += 1;
      if (sequence.stage !== "intro") metrics.followUpsSentToday += 1;
    }

    if (repliedAt && isSameUtcDay(repliedAt, now)) metrics.repliesToday += 1;
    if (sequence.status === "replied") metrics.activeConversations += 1;

    if (sequence.status === "sent" && !sequence.repliedAt) {
      const referenceAt = sentAt ?? new Date(sequence.updatedAt);
      if ((now.getTime() - referenceAt.getTime()) / ONE_DAY_MS > 5) metrics.staleSentNoReply += 1;
    }
  }

  return metrics;
};

export const calculateConversationDailyProgress = (params: { metrics: ConversationExecutionMetrics; quota?: ConversationDailyQuota }): number => {
  const quota = params.quota ?? getDefaultConversationDailyQuota();
  const sentToday = params.metrics.newOutreachSentToday + params.metrics.followUpsSentToday;
  const targetTotal = quota.newOutreach + quota.followUps;
  if (targetTotal <= 0) return 100;
  return Math.min(100, Math.round((sentToday / targetTotal) * 100));
};
