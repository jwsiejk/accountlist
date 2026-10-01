import assert from "node:assert/strict";
import test from "node:test";

import {
  checkSendable,
  computeSequence,
  QUEUED_GRACE_MS,
  summarizeBatch,
  type ProspectStatusName,
  type SequenceMessage,
} from "./sequence";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-10T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

function msg(step: number, sentAgo: number | null, createdAgo = sentAgo ?? 0): SequenceMessage {
  return { step, sentAt: sentAgo === null ? null : ago(sentAgo), createdAt: ago(createdAgo) };
}
function prospect(status: ProspectStatusName, messages: SequenceMessage[]) {
  return { status, messages };
}

test("a fresh contact is ready for Email 1; Emails 2 and 3 wait", () => {
  const seq = computeSequence(prospect("PENDING", []), undefined, NOW);
  assert.deepEqual(seq.steps.map((s) => s.state), ["due", "waiting", "waiting"]);
  assert.equal(seq.nextStep, 1);
  assert.equal(seq.status, "not_started");
});

test("Email 2 is scheduled until the gap after Email 1 has passed, then due", () => {
  const early = computeSequence(prospect("SENT", [msg(1, 1 * DAY)]), { email2DelayDays: 3, email3DelayDays: 4 }, NOW);
  assert.equal(early.steps[1].state, "scheduled");
  assert.equal(early.steps[1].dueAt!.toISOString(), new Date(NOW.getTime() - 1 * DAY + 3 * DAY).toISOString());
  assert.equal(early.nextStep, 2);
  assert.equal(early.status, "in_progress");

  const later = computeSequence(prospect("SENT", [msg(1, 3 * DAY)]), { email2DelayDays: 3, email3DelayDays: 4 }, NOW);
  assert.equal(later.steps[1].state, "due");
});

test("Email 3 waits on Email 2, then follows its own gap", () => {
  const delays = { email2DelayDays: 3, email3DelayDays: 4 };
  // Email 2 went out 2 days ago, gap is 4 days -> Email 3 due in 2 days.
  const seq = computeSequence(prospect("SENT", [msg(1, 10 * DAY), msg(2, 2 * DAY)]), delays, NOW);
  assert.deepEqual(seq.steps.map((s) => s.state), ["sent", "sent", "scheduled"]);
  assert.equal(seq.steps[2].dueAt!.getTime(), NOW.getTime() - 2 * DAY + 4 * DAY);

  // Email 2 went out 5 days ago -> the 4-day gap has passed, Email 3 is due now.
  const due = computeSequence(prospect("SENT", [msg(1, 10 * DAY), msg(2, 5 * DAY)]), delays, NOW);
  assert.equal(due.steps[2].state, "due");
});

test("all three sent = complete, nothing left to send", () => {
  const seq = computeSequence(prospect("SENT", [msg(1, 12 * DAY), msg(2, 8 * DAY), msg(3, 2 * DAY)]), undefined, NOW);
  assert.equal(seq.status, "complete");
  assert.equal(seq.nextStep, null);
});

test("a queued (unconfirmed, recent) send blocks that step and the ones after it", () => {
  const seq = computeSequence(prospect("SENDING", [msg(1, null, 5 * 60 * 1000)]), undefined, NOW);
  assert.deepEqual(seq.steps.map((s) => s.state), ["queued", "waiting", "waiting"]);
  assert.equal(seq.nextStep, null);
  assert.equal(seq.status, "in_progress");
  assert.equal(checkSendable(prospect("SENDING", [msg(1, null, 5 * 60 * 1000)]), 1, undefined, NOW).ok, false);
});

test("an unconfirmed send older than the grace window is treated as failed and can be retried", () => {
  const stale = prospect("SENDING", [msg(1, null, QUEUED_GRACE_MS + 60_000)]);
  const seq = computeSequence(stale, undefined, NOW);
  assert.equal(seq.steps[0].state, "due");
  assert.equal(seq.steps[0].unconfirmed, true);
  assert.equal(checkSendable(stale, 1, undefined, NOW).ok, true);
});

test("a reply or bounce stops the sequence for anything not yet sent, but keeps what was sent", () => {
  for (const status of ["REPLIED", "BOUNCED"] as const) {
    const seq = computeSequence(prospect(status, [msg(1, 5 * DAY)]), undefined, NOW);
    assert.deepEqual(seq.steps.map((s) => s.state), ["sent", "stopped", "stopped"]);
    assert.equal(seq.nextStep, null);
    assert.equal(seq.status, status === "REPLIED" ? "replied" : "bounced");
    assert.equal(checkSendable(prospect(status, [msg(1, 5 * DAY)]), 2, undefined, NOW).ok, false);
  }
});

test("checkSendable enforces order and no double-sends", () => {
  assert.equal(checkSendable(prospect("PENDING", []), 1, undefined, NOW).ok, true);
  assert.equal(checkSendable(prospect("PENDING", []), 2, undefined, NOW).ok, false); // Email 1 not sent
  assert.equal(checkSendable(prospect("SENT", [msg(1, 5 * DAY)]), 1, undefined, NOW).ok, false); // already sent
  assert.equal(checkSendable(prospect("SENT", [msg(1, 5 * DAY)]), 2, undefined, NOW).ok, true);
  // early (scheduled) sends are allowed by choice
  assert.equal(checkSendable(prospect("SENT", [msg(1, 1 * DAY)]), 2, undefined, NOW).ok, true);
});

test("history travels with the contact: progress depends only on their messages", () => {
  // Moving a contact to another batch changes nothing the sequence reads.
  const p = prospect("OPENED", [msg(1, 6 * DAY), msg(2, 2 * DAY)]);
  const before = computeSequence(p, undefined, NOW);
  const after = computeSequence({ ...p }, undefined, NOW);
  assert.deepEqual(before, after);
  assert.equal(before.steps[1].state, "sent");
});

test("summarizeBatch rolls up per-step counts, due counts and engagement", () => {
  const mk = (status: ProspectStatusName, messages: SequenceMessage[], engagement = { opened: false, clicked: false, replied: false }) => ({
    status,
    sequence: computeSequence(prospect(status, messages), undefined, NOW),
    engagement,
  });
  const summary = summarizeBatch([
    mk("PENDING", []),
    mk("SENT", [msg(1, 5 * DAY)]), // Email 2 due
    mk("CLICKED", [msg(1, 6 * DAY), msg(2, 1 * DAY)], { opened: true, clicked: true, replied: false }),
    mk("REPLIED", [msg(1, 7 * DAY)], { opened: true, clicked: false, replied: true }),
    mk("BOUNCED", [msg(1, 7 * DAY)]),
  ]);
  assert.equal(summary.total, 5);
  assert.deepEqual(summary.sentByStep, [4, 1, 0]);
  assert.deepEqual(summary.dueByStep, [1, 1, 0]);
  assert.equal(summary.notStarted, 1);
  assert.equal(summary.inProgress, 2);
  assert.equal(summary.opened, 2);
  assert.equal(summary.clicked, 1);
  assert.equal(summary.replied, 1);
  assert.equal(summary.bounced, 1);
});
