import type { OutreachSequence } from "./types";

export type ConversationDailyQuota = {
  newOutreachTarget: number;
  followUpTarget: number;
};

export type ConversationMetricsWindow = "today" | "last7Days" | "allTime";

export type ConversationExecutionMetrics = {
  window: ConversationMetricsWindow;
  newOutreachSent: number;
  followUpsSent: number;
  skipped: number;
  replies: number;
  activeConversations: number;
  staleSentNoReply: number;
};

export type ConversationDailyProgress = {
  quota: ConversationDailyQuota;
  newOutreachSent: number;
  followUpsSent: number;
  totalCompleted: number;
  totalTarget: number;
  progressPct: number;
  remainingNewOutreach: number;
  remainingFollowUps: number;
};

const ONE_DAY_MS = 86_400_000;

const isValidDate = (value: Date | null) => Boolean(value && !Number.isNaN(value.getTime()));

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return isValidDate(date) ? date : null;
};

const isSameUtcDay = (left: Date, right: Date) => left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);

const isWithinWindow = (value: Date, today: Date, window: ConversationMetricsWindow) => {
  if (window === "allTime") return true;
  if (window === "today") return isSameUtcDay(value, today);
  const deltaMs = today.getTime() - value.getTime();
  return deltaMs >= 0 && deltaMs < ONE_DAY_MS * 7;
};

export const getDefaultConversationDailyQuota = (): ConversationDailyQuota => ({
  newOutreachTarget: 8,
  followUpTarget: 5,
});

export const calculateConversationExecutionMetrics = (params: {
  sequences: OutreachSequence[];
  today: Date;
  window: ConversationMetricsWindow;
}): ConversationExecutionMetrics => {
  const { sequences, today, window } = params;
  const metrics: ConversationExecutionMetrics = {
    window,
    newOutreachSent: 0,
    followUpsSent: 0,
    skipped: 0,
    replies: 0,
    activeConversations: 0,
    staleSentNoReply: 0,
  };

  for (const sequence of sequences) {
    const sentAt = parseDate(sequence.sentAt);
    const repliedAt = parseDate(sequence.repliedAt);

    if (sentAt && isWithinWindow(sentAt, today, window)) {
      if (sequence.stage === "intro") metrics.newOutreachSent += 1;
      if (sequence.stage !== "intro") metrics.followUpsSent += 1;
    }

    if (repliedAt && isWithinWindow(repliedAt, today, window)) metrics.replies += 1;

    if (sequence.status === "skipped") {
      if (window === "allTime") {
        metrics.skipped += 1;
      } else {
        const updatedAt = parseDate(sequence.updatedAt);
        if (updatedAt && isWithinWindow(updatedAt, today, window)) metrics.skipped += 1;
      }
    }
    if (sequence.status === "replied") metrics.activeConversations += 1;

    if (sequence.status === "sent" && !sequence.repliedAt) {
      const referenceAt = sentAt ?? parseDate(sequence.updatedAt);
      if (referenceAt && (today.getTime() - referenceAt.getTime()) / ONE_DAY_MS > 5) metrics.staleSentNoReply += 1;
    }
  }

  return metrics;
};

export const calculateConversationDailyProgress = (params: {
  metrics: ConversationExecutionMetrics;
  quota?: ConversationDailyQuota;
}): ConversationDailyProgress => {
  const quota = params.quota ?? getDefaultConversationDailyQuota();
  const newOutreachSent = params.metrics.newOutreachSent;
  const followUpsSent = params.metrics.followUpsSent;
  const totalCompleted = newOutreachSent + followUpsSent;
  const totalTarget = quota.newOutreachTarget + quota.followUpTarget;
  const progressPct = totalTarget <= 0 ? 100 : Math.max(0, Math.min(100, Math.round((totalCompleted / totalTarget) * 100)));

  return {
    quota,
    newOutreachSent,
    followUpsSent,
    totalCompleted,
    totalTarget,
    progressPct,
    remainingNewOutreach: Math.max(0, quota.newOutreachTarget - newOutreachSent),
    remainingFollowUps: Math.max(0, quota.followUpTarget - followUpsSent),
  };
};
