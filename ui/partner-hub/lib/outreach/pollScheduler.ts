/**
 * Coordinates IMAP polls of the relay mailbox so that:
 *
 *  - only one poll runs at a time in this server process (the scheduled
 *    GitHub Actions call and the dashboard-triggered one share the lock, so
 *    two polls can never process the same mailbox UIDs at once and
 *    double-log a confirmation or reply), and
 *  - the dashboard can ask for a poll "in the background, if it's been a
 *    while" (kick) without making its own request wait for the result, and
 *    a backlog bigger than one poll's message cap is drained in a chain.
 *
 * Why this exists: confirmations that an email went out are only recorded
 * when something polls the mailbox. The scheduled GitHub Actions poll is
 * best-effort and in practice has run only every few hours, each run
 * handles at most SC26_IMAP_POLL_MAX_MESSAGES (25) messages, and one batch
 * of ~70 sends puts ~140 messages (send requests + confirmations) in that
 * mailbox -- so contacts sat at "Queued" for hours.
 *
 * Pure (the poll function and clock are injected) so it's unit-testable --
 * see pollScheduler.test.ts. The real wiring is in pollKick.ts.
 */

export interface PollOutcome {
  /** True if the poll stopped early with more mail still waiting. */
  truncated: boolean;
}

export interface PollSchedulerOptions<T extends PollOutcome> {
  poll: () => Promise<T>;
  /** Minimum time between background kicks starting a poll. Default 60s. */
  minIntervalMs?: number;
  /** Max polls run back to back in one kick while each is truncated. Default 8. */
  maxChain?: number;
  now?: () => number;
  onError?: (err: unknown) => void;
}

export interface PollScheduler<T extends PollOutcome> {
  /**
   * Starts a background poll (chained while truncated) unless one is already
   * running or one started less than minIntervalMs ago. Returns whether it
   * started. Never throws and never waits for the poll.
   */
  kick(): boolean;
  /**
   * Runs exactly one poll and returns its result (errors propagate to the
   * caller), or { ran: false } without polling if another poll is in flight.
   */
  runOnce(): Promise<{ ran: true; result: T } | { ran: false }>;
  isRunning(): boolean;
  /** Resolves when no poll is in flight (for tests and graceful shutdown). */
  whenIdle(): Promise<void>;
}

export function createPollScheduler<T extends PollOutcome>(options: PollSchedulerOptions<T>): PollScheduler<T> {
  const minIntervalMs = options.minIntervalMs ?? 60_000;
  const maxChain = options.maxChain ?? 8;
  const now = options.now ?? Date.now;

  let inFlight: Promise<void> | null = null;
  let lastStartAt = Number.NEGATIVE_INFINITY;

  async function chain(): Promise<void> {
    try {
      for (let i = 0; i < maxChain; i++) {
        const result = await options.poll();
        if (!result.truncated) break;
      }
    } catch (err) {
      options.onError?.(err);
    }
  }

  return {
    kick() {
      if (inFlight || now() - lastStartAt < minIntervalMs) return false;
      lastStartAt = now();
      inFlight = chain().finally(() => {
        inFlight = null;
      });
      return true;
    },

    async runOnce() {
      if (inFlight) return { ran: false as const };
      lastStartAt = now();
      let release!: () => void;
      inFlight = new Promise<void>((resolve) => {
        release = resolve;
      });
      try {
        const result = await options.poll();
        return { ran: true as const, result };
      } finally {
        inFlight = null;
        release();
      }
    },

    isRunning() {
      return inFlight !== null;
    },

    whenIdle() {
      return inFlight ?? Promise.resolve();
    },
  };
}
