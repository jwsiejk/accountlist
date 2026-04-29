import type { ConversationOutcome, ConversationOutcomeType, JobHunterStore } from "./types";

const toIso = (value: Date) => value.toISOString();

const createOutcomeId = (sequenceId: string, type: ConversationOutcomeType, now: Date) => `${sequenceId}:${type}:${now.getTime()}`;

export const addConversationOutcome = (store: JobHunterStore, sequenceId: string, type: ConversationOutcomeType, now: Date): JobHunterStore => {
  const sequence = store.outreachSequencesById[sequenceId];
  if (!sequence) return store;
  const outcome: ConversationOutcome = {
    id: createOutcomeId(sequenceId, type, now),
    sequenceId,
    jobId: sequence.jobId,
    contactId: sequence.contactId,
    type,
    createdAt: toIso(now),
  };

  let nextSequence = sequence;
  if (type === "reply_received") {
    const nowIso = toIso(now);
    nextSequence = { ...sequence, status: "replied", repliedAt: nowIso, updatedAt: nowIso };
  }

  return {
    ...store,
    outreachSequencesById: { ...store.outreachSequencesById, [sequenceId]: nextSequence },
    outreachSequences: store.outreachSequences.map((item) => (item.id === sequenceId ? nextSequence : item)),
    conversationOutcomesById: { ...(store.conversationOutcomesById ?? {}), [outcome.id]: outcome },
    conversationOutcomes: [...(store.conversationOutcomes ?? []), outcome],
  };
};
