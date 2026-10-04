import assert from "node:assert/strict";
import test from "node:test";

import { classifyTrackingEvent } from "./eventClassification";

const dispatchedAt = new Date("2026-10-01T14:00:00Z");
const at = (minutes: number, seconds = 0) => new Date(dispatchedAt.getTime() + minutes * 60_000 + seconds * 1000);

test("hit within 15 minutes of dispatch is automated", () => {
  assert.equal(classifyTrackingEvent({ dispatchedAt, occurredAt: at(7) }).automated, true);
});

test("hit an hour after dispatch with nothing else is a real event", () => {
  assert.equal(classifyTrackingEvent({ dispatchedAt, occurredAt: at(60) }).automated, false);
});

test("hit within 5 minutes of confirmed delivery is automated even if dispatch was long before", () => {
  const result = classifyTrackingEvent({ dispatchedAt, confirmedSentAt: at(40), occurredAt: at(42) });
  assert.equal(result.automated, true);
});

test("hit shortly after an automated scan is part of the same burst", () => {
  const result = classifyTrackingEvent({
    dispatchedAt,
    occurredAt: at(16),
    priorEvents: [{ occurredAt: at(15, 30), automated: true }],
  });
  assert.equal(result.automated, true);
});

test("three hits within ten seconds are automated", () => {
  const result = classifyTrackingEvent({
    dispatchedAt,
    occurredAt: at(90, 8),
    priorEvents: [
      { occurredAt: at(90, 0), automated: false },
      { occurredAt: at(90, 4), automated: false },
    ],
  });
  assert.equal(result.automated, true);
});

test("a real open followed by a click a minute later stays real", () => {
  const result = classifyTrackingEvent({
    dispatchedAt,
    occurredAt: at(181),
    priorEvents: [{ occurredAt: at(180), automated: false }],
  });
  assert.equal(result.automated, false);
});

test("scanner user-agent is automated regardless of timing", () => {
  const result = classifyTrackingEvent({ dispatchedAt, occurredAt: at(300), userAgent: "Mozilla/5.0 SafeLinks" });
  assert.equal(result.automated, true);
});
