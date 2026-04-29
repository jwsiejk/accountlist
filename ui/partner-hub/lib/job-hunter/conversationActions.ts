import { normalizeCompanyKey } from "./conversations";
import { getOutreachPreview } from "./conversationUi";
import type { ConversationTarget, JobPosting, OutreachSequence } from "./types";

export type ConversationActionType = "send_follow_up" | "review_reply" | "send_draft" | "add_target" | "review_stale_sent";
export type SequenceAction = "edit" | "copy" | "mark_sent" | "skip";
export type ConversationAction = {
  id: string;
  actionType: ConversationActionType;
  priority: number;
  company?: string;
  role?: string;
  contact?: string;
  messagePreview?: string;
  sequenceId?: string;
  supportedActions: SequenceAction[];
  guide?: "roles_needing_targets";
};

const PRIORITY_ORDER: ConversationActionType[] = ["send_follow_up", "review_reply", "send_draft", "add_target", "review_stale_sent"];
const PRIORITY_RANK = new Map(PRIORITY_ORDER.map((type, index) => [type, index + 1]));

const getSequenceContext = (sequence: OutreachSequence, jobsById: Record<string, JobPosting>, targetsById: Record<string, ConversationTarget>) => ({
  company: jobsById[sequence.jobId]?.company ?? targetsById[sequence.contactId]?.company,
  role: jobsById[sequence.jobId]?.title,
  contact: targetsById[sequence.contactId]?.name,
});

export const buildDailyConversationActions = (params: {
  today: Date;
  limit?: number;
  sequences: OutreachSequence[];
  targets: ConversationTarget[];
  jobs: JobPosting[];
}): ConversationAction[] => {
  const { sequences, targets, jobs, today } = params;
  const limit = params.limit ?? 10;
  const todayIso = today.toISOString().slice(0, 10);
  const jobsById = Object.fromEntries(jobs.map((job) => [job.id, job]));
  const targetsById = Object.fromEntries(targets.map((target) => [target.id, target]));

  const companiesWithTargets = new Set(targets.map((target) => normalizeCompanyKey(target.company)));

  const actions: ConversationAction[] = [];

  for (const sequence of sequences) {
    const context = getSequenceContext(sequence, jobsById, targetsById);
    if ((sequence.stage === "follow_up_1" || sequence.stage === "follow_up_2") && (sequence.status === "draft" || sequence.status === "queued") && (sequence.dueAt?.slice(0, 10) ?? "") <= todayIso) {
      actions.push({ id: `send_follow_up:${sequence.id}`, actionType: "send_follow_up", priority: 1, ...context, messagePreview: getOutreachPreview(sequence), sequenceId: sequence.id, supportedActions: ["edit", "copy", "mark_sent", "skip"] });
      continue;
    }
    if (sequence.status === "replied") {
      actions.push({ id: `review_reply:${sequence.id}`, actionType: "review_reply", priority: 2, ...context, messagePreview: getOutreachPreview(sequence), sequenceId: sequence.id, supportedActions: ["copy", "skip"] });
      continue;
    }
    if ((sequence.status === "draft" || sequence.status === "queued") && sequence.stage === "intro") {
      actions.push({ id: `send_draft:${sequence.id}`, actionType: "send_draft", priority: 3, ...context, messagePreview: getOutreachPreview(sequence), sequenceId: sequence.id, supportedActions: ["edit", "copy", "mark_sent", "skip"] });
      continue;
    }
    if (sequence.status === "sent" && !sequence.repliedAt && (today.getTime() - new Date(sequence.sentAt ?? sequence.updatedAt).getTime()) / 86400000 > 5) {
      actions.push({ id: `review_stale_sent:${sequence.id}`, actionType: "review_stale_sent", priority: 5, ...context, messagePreview: getOutreachPreview(sequence), sequenceId: sequence.id, supportedActions: ["copy", "skip"] });
    }
  }

  for (const job of jobs) {
    if (!companiesWithTargets.has(normalizeCompanyKey(job.company))) {
      actions.push({ id: `add_target:${job.id}`, actionType: "add_target", priority: 4, company: job.company, role: job.title, supportedActions: ["skip"], guide: "roles_needing_targets" });
    }
  }

  return actions
    .sort((a, b) => {
      const rankA = PRIORITY_RANK.get(a.actionType) ?? 999;
      const rankB = PRIORITY_RANK.get(b.actionType) ?? 999;
      if (rankA !== rankB) return rankA - rankB;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
};
