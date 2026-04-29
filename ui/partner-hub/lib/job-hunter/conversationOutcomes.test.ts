import assert from "node:assert/strict";
import test from "node:test";

import { addConversationOutcome } from "./conversationOutcomes";
import type { JobHunterStore, OutreachSequence } from "./types";

const baseSequence: OutreachSequence = {
  id: "seq-1",
  jobId: "job-1",
  contactId: "target-1",
  stage: "intro",
  channel: "linkedin",
  generatedMessage: "Hello",
  status: "sent",
  createdAt: "2026-04-29T00:00:00.000Z",
  updatedAt: "2026-04-29T00:00:00.000Z",
};

const baseStore: JobHunterStore = {
  jobs: [], jobsById: {}, selectedJobIds: [], sources: [], applications: [], applicationsById: {},
  conversationTargets: [], conversationTargetsById: {}, conversationBriefs: [], conversationBriefsById: {},
  outreachSequences: [baseSequence], outreachSequencesById: { [baseSequence.id]: baseSequence },
  conversationOutcomes: [], conversationOutcomesById: {},
};

test("addConversationOutcome appends manual outcomes", () => {
  const now = new Date("2026-04-29T15:00:00.000Z");
  const next = addConversationOutcome(baseStore, baseSequence.id, "interview_scheduled", now);
  assert.equal(next.conversationOutcomes.length, 1);
  assert.equal(next.conversationOutcomes[0]?.type, "interview_scheduled");
  assert.equal(next.outreachSequencesById[baseSequence.id]?.status, "sent");
});

test("reply_received marks sequence replied and timestamps repliedAt", () => {
  const now = new Date("2026-04-29T16:00:00.000Z");
  const next = addConversationOutcome(baseStore, baseSequence.id, "reply_received", now);
  assert.equal(next.conversationOutcomes.length, 1);
  assert.equal(next.conversationOutcomes[0]?.type, "reply_received");
  assert.equal(next.outreachSequencesById[baseSequence.id]?.status, "replied");
  assert.equal(next.outreachSequencesById[baseSequence.id]?.repliedAt, now.toISOString());
});
