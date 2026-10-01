import assert from "node:assert/strict";
import test from "node:test";

import { createPollScheduler } from "./pollScheduler";

function harness(opts: { results?: boolean[]; failAt?: number; minIntervalMs?: number; maxChain?: number } = {}) {
  let clock = 1_000_000;
  let calls = 0;
  let concurrent = 0;
  let maxConcurrent = 0;
  const errors: unknown[] = [];
  const results = opts.results ?? [false];
  let gate: (() => void) | null = null;

  const scheduler = createPollScheduler({
    minIntervalMs: opts.minIntervalMs,
    maxChain: opts.maxChain,
    now: () => clock,
    onError: (e) => errors.push(e),
    poll: async () => {
      const n = calls++;
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      try {
        // yield so overlapping callers could interleave if the lock were broken
        await new Promise<void>((resolve) => setImmediate(resolve));
        if (gate) await new Promise<void>((resolve) => (gate = resolve));
        if (opts.failAt === n) throw new Error("imap down");
        return { truncated: results[Math.min(n, results.length - 1)] };
      } finally {
        concurrent--;
      }
    },
  });
  return {
    scheduler,
    advance: (ms: number) => {
      clock += ms;
    },
    stats: () => ({ calls, maxConcurrent, errors }),
    hold: () => {
      gate = () => {};
    },
    release: () => {
      const g = gate;
      gate = null;
      g?.();
    },
  };
}

test("kick starts a background poll once; a second kick while running does nothing", async () => {
  const h = harness();
  assert.equal(h.scheduler.kick(), true);
  assert.equal(h.scheduler.kick(), false);
  assert.equal(h.scheduler.isRunning(), true);
  await h.scheduler.whenIdle();
  assert.equal(h.stats().calls, 1);
  assert.equal(h.scheduler.isRunning(), false);
});

test("kicks are throttled to the minimum interval, then allowed again", async () => {
  const h = harness({ minIntervalMs: 60_000 });
  assert.equal(h.scheduler.kick(), true);
  await h.scheduler.whenIdle();
  h.advance(30_000);
  assert.equal(h.scheduler.kick(), false, "too soon");
  h.advance(31_000);
  assert.equal(h.scheduler.kick(), true, "interval elapsed");
  await h.scheduler.whenIdle();
  assert.equal(h.stats().calls, 2);
});

test("a truncated poll is chained until the backlog is drained", async () => {
  const h = harness({ results: [true, true, true, false] });
  h.scheduler.kick();
  await h.scheduler.whenIdle();
  assert.equal(h.stats().calls, 4);
});

test("chaining is capped so one kick can't run forever", async () => {
  const h = harness({ results: [true], maxChain: 3 });
  h.scheduler.kick();
  await h.scheduler.whenIdle();
  assert.equal(h.stats().calls, 3);
});

test("a failing poll is reported, stops the chain, and doesn't wedge the scheduler", async () => {
  const h = harness({ results: [true, true], failAt: 1, minIntervalMs: 1000 });
  h.scheduler.kick();
  await h.scheduler.whenIdle();
  assert.equal(h.stats().calls, 2);
  assert.equal(h.stats().errors.length, 1);
  assert.equal(h.scheduler.isRunning(), false);
  h.advance(2000);
  assert.equal(h.scheduler.kick(), true, "usable again after an error");
  await h.scheduler.whenIdle();
});

test("runOnce returns the result when idle and refuses when a poll is already running", async () => {
  const h = harness();
  h.hold();
  const first = h.scheduler.runOnce();
  const second = await h.scheduler.runOnce();
  assert.deepEqual(second, { ran: false });
  assert.equal(h.scheduler.kick(), false, "kick also respects the lock");
  h.release();
  const done = await first;
  assert.equal(done.ran, true);
  assert.equal(h.stats().maxConcurrent, 1, "polls never overlapped");
  assert.equal(h.scheduler.isRunning(), false);
});

test("runOnce propagates poll errors and releases the lock", async () => {
  const h = harness({ failAt: 0 });
  await assert.rejects(() => h.scheduler.runOnce(), /imap down/);
  assert.equal(h.scheduler.isRunning(), false);
  const again = await h.scheduler.runOnce();
  assert.equal(again.ran, true);
});

test("polls from kick and runOnce never overlap", async () => {
  const h = harness({ results: [true, true, false] });
  h.scheduler.kick();
  const attempts = await Promise.all([h.scheduler.runOnce(), h.scheduler.runOnce(), h.scheduler.runOnce()]);
  assert.ok(attempts.every((a) => a.ran === false));
  await h.scheduler.whenIdle();
  assert.equal(h.stats().maxConcurrent, 1);
});
