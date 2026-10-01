/**
 * Rate-limit handling for the Resend send-request dispatch (relay-send.ts).
 *
 * Resend allows 10 requests per second per account. The send route dispatches
 * one request per contact, so a large batch exceeds that unless the requests
 * are spaced out -- which is what failed with "429 Too Many Requests" on a
 * batch of ~70. Two layers, both pure so they can be tested without a network:
 *
 *  1. Pacing: leave at least MIN_DISPATCH_INTERVAL_MS between request starts
 *     (~6/s, comfortably under the limit even if two sends overlap).
 *  2. Retry: if Resend still answers 429, wait and try again. A 429 means the
 *     request was rejected before anything was sent, so retrying can't
 *     double-send. (Other failures are NOT retried -- a timeout or 5xx may
 *     have gone through, and retrying those could email someone twice.)
 */

export const MIN_DISPATCH_INTERVAL_MS = 150;
export const MAX_RATE_LIMIT_RETRIES = 5;

const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8_000;
const MAX_RETRY_AFTER_MS = 10_000;

/**
 * How long to wait before retry number `attempt` (1 = first retry). Uses
 * exponential backoff (0.5s, 1s, 2s, 4s, 8s), or Resend's own Retry-After
 * header (seconds) if that asks for longer, capped so one request can't
 * stall the whole send for long.
 */
export function retryDelayMs(attempt: number, retryAfterHeader?: string | null): number {
  const backoff = Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1), MAX_BACKOFF_MS);
  const seconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
  const retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : 0;
  return Math.max(backoff, retryAfter);
}

/**
 * Reserves the next dispatch slot. `nextSlotAt` is the earliest time the
 * next request may start; returns how long the caller should wait from `now`
 * and the updated `nextSlotAt`. Slots are handed out back to back, so
 * concurrent callers each get their own, spaced `intervalMs` apart.
 */
export function reserveSlot(
  nextSlotAt: number,
  now: number,
  intervalMs: number = MIN_DISPATCH_INTERVAL_MS
): { waitMs: number; nextSlotAt: number } {
  const start = Math.max(now, nextSlotAt);
  return { waitMs: start - now, nextSlotAt: start + intervalMs };
}
