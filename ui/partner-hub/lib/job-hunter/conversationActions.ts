import { getOutreachPreview } from "./conversationUi";
import type { ConversationDailyAction, ConversationTarget, JobPosting, OutreachSequence } from "./types";

export type SequenceAction = "edit" | "copy" | "mark_sent" | "skip";

type BuilderAction = ConversationDailyAction & {
  supportedActions: SequenceAction[];
  messagePreview?: string;
  sequenceId?: string;
  guide?: "roles_needing_targets";
};

const PRIORITY_ORDER: ConversationDailyAction["type"][] = ["send_follow_up", "review_reply", "send_draft", "add_target", "review_stale_sent"];
const PRIORITY_RANK = new Map(PRIORITY_ORDER.map((type, index) => [type, index + 1]));

const getSequenceContext = (sequence: OutreachSequence, jobsById: Record<string, JobPosting>, targetsById: Record<string, ConversationTarget>) => ({
  company: jobsById[sequence.jobId]?.company ?? targetsById[sequence.contactId]?.company,
  roleTitle: jobsById[sequence.jobId]?.title,
  contactName: targetsById[sequence.contactId]?.name,
});

export const buildDailyConversationActions = (params: {
  jobsById: Record<string, JobPosting>;
  targetsById: Record<string, ConversationTarget>;
  actions: ReturnType<typeof import("./conversations").getTodaysConversationActions>;
  maxActions?: number;
}): BuilderAction[] => {
  const { jobsById, targetsById, actions: todays } = params;
  const limit = params.maxActions ?? 10;

  const actions: BuilderAction[] = [];

  for (const sequence of todays.followUpsDue) {
    const context = getSequenceContext(sequence, jobsById, targetsById);
    actions.push({ id: `send_follow_up:${sequence.id}`, type: "send_follow_up", priority: "high", label: "Send follow-up", description: "Due follow-up ready to send.", dueAt: sequence.dueAt, ...context, messagePreview: getOutreachPreview(sequence), sequenceId: sequence.id, supportedActions: ["edit", "copy", "mark_sent", "skip"] });
  }

  for (const sequence of todays.activeReplies) {
    const context = getSequenceContext(sequence, jobsById, targetsById);
    actions.push({ id: `review_reply:${sequence.id}`, type: "review_reply", priority: "high", label: "Review reply", description: "A contact replied and needs review.", ...context, messagePreview: getOutreachPreview(sequence), sequenceId: sequence.id, supportedActions: ["copy", "skip"] });
  }

  for (const sequence of todays.draftsToReview.filter((s) => s.stage === "intro")) {
    const context = getSequenceContext(sequence, jobsById, targetsById);
    actions.push({ id: `send_draft:${sequence.id}`, type: "send_draft", priority: "medium", label: "Send intro draft", description: "Intro outreach draft ready for polish and send.", dueAt: sequence.dueAt, ...context, messagePreview: getOutreachPreview(sequence), sequenceId: sequence.id, supportedActions: ["edit", "copy", "mark_sent", "skip"] });
  }

  for (const sequence of todays.staleSentNoReply) {
    const context = getSequenceContext(sequence, jobsById, targetsById);
    actions.push({ id: `review_stale_sent:${sequence.id}`, type: "review_stale_sent", priority: "low", label: "Review stale sent", description: "Sent outreach has gone stale without a reply.", ...context, messagePreview: getOutreachPreview(sequence), sequenceId: sequence.id, supportedActions: ["copy", "skip"] });
  }

  for (const job of todays.rolesNeedingTargets) {
    actions.push({ id: `add_target:${job.id}`, type: "add_target", priority: "medium", label: "Add target", description: "Role needs at least one contact target.", company: job.company, roleTitle: job.title, supportedActions: ["skip"], guide: "roles_needing_targets" });
  }

  return actions.sort((a, b) => {
    const rankA = PRIORITY_RANK.get(a.type) ?? 999;
    const rankB = PRIORITY_RANK.get(b.type) ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    return a.id.localeCompare(b.id);
  }).slice(0, limit);
};
