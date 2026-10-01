import assert from "node:assert/strict";
import test from "node:test";

import { MIN_DISPATCH_INTERVAL_MS, retryDelayMs, reserveSlot } from "./rateLimit";

test("the pacing interval keeps requests under Resend's 10/second limit", () => {
  assert.ok(1000 / MIN_DISPATCH_INTERVAL_MS < 10);
});

test("backoff doubles each retry and is capped", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((n) => retryDelayMs(n)), [500, 1000, 2000, 4000, 8000, 8000, 8000]);
});

test("a longer Retry-After from Resend wins, but is capped", () => {
  assert.equal(retryDelayMs(1, "3"), 3000);
  assert.equal(retryDelayMs(1, "120"), 10_000);
  assert.equal(retryDelayMs(4, "1"), 4000); // backoff already longer
});

test("a missing or junk Retry-After falls back to plain backoff", () => {
  for (const bad of [undefined, null, "", "soon", "-5", "0"]) {
    assert.equal(retryDelayMs(2, bad), 1000);
  }
});

test("slots are handed out back to back, never closer than the interval", () => {
  let next = 0;
  const waits: number[] = [];
  // 5 callers all arriving at the same instant (t=1000)
  for (let i = 0; i < 5; i++) {
    const r = reserveSlot(next, 1000, 150);
    waits.push(r.waitMs);
    next = r.nextSlotAt;
  }
  assert.deepEqual(waits, [0, 150, 300, 450, 600]);
});

test("no waiting when callers are already spaced out", () => {
  const first = reserveSlot(0, 1000, 150);
  const second = reserveSlot(first.nextSlotAt, 2000, 150);
  assert.equal(first.waitMs, 0);
  assert.equal(second.waitMs, 0);
});

test("a 73-contact batch is paced to well under 10 requests/second", () => {
  let next = 0;
  let lastStart = -Infinity;
  const starts: number[] = [];
  for (let i = 0; i < 73; i++) {
    const r = reserveSlot(next, 0, 150);
    next = r.nextSlotAt;
    starts.push(r.waitMs);
    assert.ok(r.waitMs - lastStart >= 0);
    lastStart = r.waitMs;
  }
  // any 1-second window contains at most 7 request starts
  for (let i = 0; i < starts.length; i++) {
    const inWindow = starts.filter((t) => t >= starts[i] && t < starts[i] + 1000).length;
    assert.ok(inWindow <= 7, `window starting ${starts[i]}ms had ${inWindow}`);
  }
});
