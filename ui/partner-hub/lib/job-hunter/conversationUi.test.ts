import assert from "node:assert/strict";
import test from "node:test";

import { getFollowUpsDue, markSequenceSent, snoozeSequence } from "./conversationUi";
import type { JobHunterStore, OutreachSequence } from "./types";

const baseSequence: OutreachSequence = {
  id: "job-1:target-1:intro:linkedin",
  jobId: "job-1",
  contactId: "target-1",
  stage: "intro",
  channel: "linkedin",
  generatedMessage: "Hello",
  status: "draft",
  dueAt: "2026-04-29T00:00:00.000Z",
  createdAt: "2026-04-29T00:00:00.000Z",
  updatedAt: "2026-04-29T00:00:00.000Z",
};

const baseStore: JobHunterStore = {
  jobs: [], jobsById: {}, selectedJobIds: [], sources: [], applications: [], applicationsById: {},
  conversationTargets: [], conversationTargetsById: {}, conversationBriefs: [], conversationBriefsById: {},
  outreachSequences: [baseSequence], outreachSequencesById: { [baseSequence.id]: baseSequence },
};

test("markSequenceSent marks sent and creates follow up", () => {
  const now = new Date("2026-04-29T12:00:00.000Z");
  const next = markSequenceSent(baseStore, baseSequence.id, now);
  assert.equal(next.outreachSequencesById[baseSequence.id]?.status, "sent");
  const followUp = Object.values(next.outreachSequencesById).find((item) => item.stage === "follow_up_1");
  assert.ok(followUp);
});

test("getFollowUpsDue returns only due follow-ups", () => {
  const due: OutreachSequence = { ...baseSequence, id: "f1", stage: "follow_up_1", dueAt: "2026-04-29T00:00:00.000Z" };
  const future: OutreachSequence = { ...baseSequence, id: "f2", stage: "follow_up_2", dueAt: "2026-05-05T00:00:00.000Z" };
  const results = getFollowUpsDue([due, future], new Date("2026-04-29T08:00:00.000Z"));
  assert.deepEqual(results.map((item) => item.id), ["f1"]);
});

test("snoozeSequence pushes dueAt forward", () => {
  const sequence: OutreachSequence = { ...baseSequence, stage: "follow_up_1" };
  const store: JobHunterStore = { ...baseStore, outreachSequences: [sequence], outreachSequencesById: { [sequence.id]: sequence } };
  const next = snoozeSequence(store, sequence.id, new Date("2026-04-29T12:00:00.000Z"));
  assert.equal(next.outreachSequencesById[sequence.id]?.dueAt?.slice(0, 10), "2026-05-01");
});
