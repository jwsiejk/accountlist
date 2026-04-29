import { addBusinessDays, scheduleNextFollowUp } from "./conversations";
import type { ConversationTarget, JobHunterStore, JobPosting, OutreachSequence } from "./types";

const toIso = (value: Date) => value.toISOString();

export const getOutreachPreview = (sequence: OutreachSequence): string => (sequence.editedMessage ?? sequence.generatedMessage ?? "").trim();

export const getDraftedOutreach = (sequences: OutreachSequence[]): OutreachSequence[] =>
  sequences.filter((sequence) => (sequence.status === "draft" || sequence.status === "queued"));

export const getFollowUpsDue = (sequences: OutreachSequence[], today: Date): OutreachSequence[] => {
  const todayIso = today.toISOString().slice(0, 10);
  return sequences.filter(
    (sequence) =>
      (sequence.stage === "follow_up_1" || sequence.stage === "follow_up_2") &&
      (sequence.status === "draft" || sequence.status === "queued") &&
      (sequence.dueAt?.slice(0, 10) ?? "") <= todayIso,
  );
};

export const applySequenceMessageEdit = (store: JobHunterStore, sequenceId: string, message: string, now: Date): JobHunterStore => {
  const sequence = store.outreachSequencesById[sequenceId];
  if (!sequence) return store;
  const next = { ...sequence, editedMessage: message, updatedAt: toIso(now) };
  return {
    ...store,
    outreachSequencesById: { ...store.outreachSequencesById, [sequenceId]: next },
    outreachSequences: store.outreachSequences.map((item) => (item.id === sequenceId ? next : item)),
  };
};

export const markSequenceSent = (store: JobHunterStore, sequenceId: string, now: Date): JobHunterStore => {
  const sequence = store.outreachSequencesById[sequenceId];
  if (!sequence) return store;
  const nowIso = toIso(now);
  const sent = { ...sequence, status: "sent" as const, sentAt: nowIso, updatedAt: nowIso };
  const followUp = scheduleNextFollowUp(sent, now);
  const outreachSequencesById = { ...store.outreachSequencesById, [sequenceId]: sent };
  const outreachSequences = store.outreachSequences.map((item) => (item.id === sequenceId ? sent : item));

  if (followUp) {
    outreachSequencesById[followUp.id] = followUp;
    if (!outreachSequences.some((item) => item.id === followUp.id)) {
      outreachSequences.push(followUp);
    }
  }

  return { ...store, outreachSequencesById, outreachSequences };
};

export const skipSequence = (store: JobHunterStore, sequenceId: string, now: Date): JobHunterStore => {
  const sequence = store.outreachSequencesById[sequenceId];
  if (!sequence) return store;
  const skipped = { ...sequence, status: "skipped" as const, updatedAt: toIso(now) };
  return {
    ...store,
    outreachSequencesById: { ...store.outreachSequencesById, [sequenceId]: skipped },
    outreachSequences: store.outreachSequences.map((item) => (item.id === sequenceId ? skipped : item)),
  };
};

export const snoozeSequence = (store: JobHunterStore, sequenceId: string, now: Date): JobHunterStore => {
  const sequence = store.outreachSequencesById[sequenceId];
  if (!sequence) return store;
  const snoozed = { ...sequence, dueAt: toIso(addBusinessDays(now, 2)), updatedAt: toIso(now) };
  return {
    ...store,
    outreachSequencesById: { ...store.outreachSequencesById, [sequenceId]: snoozed },
    outreachSequences: store.outreachSequences.map((item) => (item.id === sequenceId ? snoozed : item)),
  };
};

export const resolveSequenceContext = (sequence: OutreachSequence, jobsById: Record<string, JobPosting>, targetsById: Record<string, ConversationTarget>) => ({
  company: jobsById[sequence.jobId]?.company ?? targetsById[sequence.contactId]?.company ?? "Unknown company",
  title: jobsById[sequence.jobId]?.title,
  target: targetsById[sequence.contactId],
});
