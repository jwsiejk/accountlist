/**
 * Process-wide poll scheduler for the relay mailbox. Cached on globalThis so
 * Next's per-route module instances (and dev hot reloads) share ONE lock --
 * the cron endpoint and the dashboard-triggered kick must never overlap.
 */
import { pollImapForReplies, type PollResult } from "./imap-poller";
import { createPollScheduler, type PollScheduler } from "./pollScheduler";

const KEY = "__outreachPollScheduler";
type G = typeof globalThis & { [KEY]?: PollScheduler<PollResult> };

export function getPollScheduler(): PollScheduler<PollResult> {
  const g = globalThis as G;
  if (!g[KEY]) {
    g[KEY] = createPollScheduler<PollResult>({
      poll: pollImapForReplies,
      onError: (err) => console.error("background IMAP poll failed:", err),
    });
  }
  return g[KEY]!;
}
