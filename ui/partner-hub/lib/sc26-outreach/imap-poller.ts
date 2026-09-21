import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import { prisma } from "@/lib/db";
import { confirmMessageSent, findLatestMessageForEmail, findMessageByToken, logEvent, markStatus } from "@/lib/sc26-outreach/prospects";
import { htmlToPlainText, parseRelayNotification, parseSendConfirmation } from "@/lib/sc26-outreach/imap-relay-parser";
import { SEND_CONFIRMED_SUBJECT_MARKER } from "@/lib/sc26-outreach/relay-send";

/**
 * Nothing in this module had a timeout anywhere, so a stalled TCP/TLS
 * handshake or a stuck IMAP command against imap.gmail.com could hang the
 * whole call indefinitely -- observed in production as a poll that was
 * still running after 6+ minutes with zero result and no error. Each stage
 * below is wrapped separately (rather than one big timeout around
 * everything) so a timeout error names which stage actually got stuck,
 * instead of leaving that a mystery on the next attempt.
 */
class ImapStageTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number, stage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ImapStageTimeoutError(`IMAP poll stuck at "${stage}" -- no response after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Only the two fields this module actually reads off imapflow's fetched
 * message object, typed locally rather than imported from `imapflow`'s own
 * types -- its exact exported type name for this couldn't be confirmed
 * without installing the package, and structural typing means this narrower
 * shape works fine against whatever imapflow actually yields as long as
 * `uid`/`source` themselves are named and typed the way its docs describe
 * (uid: always-present Number; source: Buffer, present because `{ source:
 * true }` is passed to fetch()).
 */
interface RelayMailMessage {
  uid: number;
  source?: Buffer;
}

/**
 * Polls the Gmail relay mailbox (scnotifyjamessiejk@gmail.com) for new
 * Power Automate relay notifications and turns matched ones into REPLIED
 * status + a TrackingEvent, the same way the (now-dead) Graph webhook route
 * used to for Graph-based reply detection.
 *
 * Not wired to run automatically anywhere yet -- call pollImapForReplies()
 * from a trigger of your choosing. app/api/sc26-outreach/imap-poll/route.ts
 * exposes it as a CRON_SECRET-protected endpoint, matching how
 * graph/subscribe/route.ts already expects an external scheduler (e.g. a
 * Render Cron Job) to call it on an interval -- there's no in-process timer
 * here, so nothing polls until something (a cron job, or you manually)
 * calls that route.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export interface PollResult {
  /** Messages fetched in this run (new UIDs only, not the whole mailbox). */
  checked: number;
  /** Matched a Prospect by email and logged a REPLY event. */
  matched: number;
  /** Parsed fine, but no Prospect exists for that email. */
  unmatched: number;
  /** Body didn't parse as a relay notification at all (no FROM line found). */
  unparsed: number;
  /** Relay notification whose From was our own DDN mailbox -- skipped. */
  ownMailbox: number;
  /** Send-flow confirmation matched a queued OutreachMessage by token. */
  confirmed: number;
  /** Send-flow confirmation whose TOKEN didn't match any OutreachMessage. */
  confirmUnmatched: number;
  errors: { uid: number; error: string }[];
  /** True if this run stopped early because of SC26_IMAP_POLL_MAX_MESSAGES. */
  truncated: boolean;
}

// Was 200. Each poll runs synchronously inside one HTTP request/response,
// and Render's own reverse proxy enforces its own request timeout on top
// of (and shorter than) whatever this function's internal stage timeouts
// allow -- observed in production as a 502 with the app itself staying up
// and logging nothing, meaning Render's proxy gave up on the connection
// while the app was potentially still working. Rather than guess at
// Render's exact limit, this keeps each run small enough to comfortably
// finish well under any reasonable proxy timeout; a real backlog just
// gets drained a bit at a time across multiple 5-minute-interval runs
// instead of in one long one (the cursor already supports this --
// `truncated: true` below is exactly this case).
const DEFAULT_MAX_MESSAGES_PER_POLL = 25;

export async function pollImapForReplies(): Promise<PollResult> {
  const host = process.env.SC26_IMAP_HOST || "imap.gmail.com";
  const port = Number(process.env.SC26_IMAP_PORT || 993);
  const user = requireEnv("SC26_IMAP_USER");
  const pass = requireEnv("SC26_IMAP_APP_PASSWORD");
  const ownMailbox = (process.env.SC26_MAILBOX || "").trim().toLowerCase();
  const maxMessages = Number(process.env.SC26_IMAP_POLL_MAX_MESSAGES || DEFAULT_MAX_MESSAGES_PER_POLL);

  const result: PollResult = {
    checked: 0,
    matched: 0,
    unmatched: 0,
    unparsed: 0,
    ownMailbox: 0,
    confirmed: 0,
    confirmUnmatched: 0,
    errors: [],
    truncated: false,
  };

  // The bounded fetch range (below) didn't fix the 30s timeout in
  // production, which means the actual bottleneck is somewhere else inside
  // this stage -- but a timeout error only tells you the *stage* name, not
  // which line inside it never returned. Since the failing promise never
  // resolves, there's no result object to inspect afterwards either. These
  // checkpoints go to console.log (visible in Render's own logs, not the
  // GitHub Actions output, which only ever sees the final HTTP response) so
  // that after the *next* timeout, whichever checkpoint printed last tells
  // us exactly where it got stuck instead of guessing again.
  const pollStartedAt = Date.now();
  const log = (msg: string) => console.log(`[sc26-imap-poll] +${Date.now() - pollStartedAt}ms ${msg}`);

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  // Without this, a socket error on a connection this function has already
  // stopped waiting on (e.g. one of the withTimeout calls below gave up on
  // it) surfaces as an unhandled EventEmitter "error" event -- which in
  // Node crashes the whole process, not just this request. That almost
  // certainly explains the HTTP 502 seen in production right after a
  // connect timeout fired correctly: the timeout worked, but the abandoned
  // connection then errored in the background with nothing listening,
  // taking the whole app down with it. This listener just needs to exist;
  // the actual error is already surfaced through the timeout/rejection
  // paths below.
  client.on("error", () => {});

  // Was 15s -- tightened along with the other two stages below so the
  // worst case across all three (connect + process + logout) stays well
  // under whatever Render's own proxy timeout turns out to be.
  log("connecting");
  await withTimeout(client.connect(), 10_000, "connect to imap.gmail.com");
  log("connected");
  try {
    await withTimeout(
      (async () => {
        const lock = await client.getMailboxLock("INBOX");
        log("mailbox lock acquired");
        try {
          const status = await client.status("INBOX", { uidValidity: true, uidNext: true });
          const uidValidity = Number(status.uidValidity);
          log(`status received: uidValidity=${uidValidity} uidNext=${status.uidNext}`);

          let cursor = await prisma.imapPollCursor.findUnique({ where: { mailbox: user } });
          if (!cursor || cursor.uidValidity !== uidValidity) {
            // First run ever, or Gmail changed UIDVALIDITY (mailbox recreated
            // -- rare, but old UIDs would be meaningless if it happened).
            // Either way, start the cursor fresh rather than guessing.
            cursor = await prisma.imapPollCursor.upsert({
              where: { mailbox: user },
              create: { mailbox: user, uidValidity, lastUid: 0 },
              update: { uidValidity, lastUid: 0 },
            });
          }
          log(`cursor loaded: lastUid=${cursor.lastUid}`);

          const startUid = cursor.lastUid + 1;
          let maxUidSeen = cursor.lastUid;

          // UIDNEXT is "one past the highest UID the server currently has",
          // so uidNext - 1 is the highest UID that can possibly exist right
          // now. Bounding the fetch to that (capped further by maxMessages)
          // keeps the actual IMAP FETCH command itself small -- an
          // open-ended "N:*" range asks Gmail to stream the *entire*
          // remaining mailbox regardless of how few messages we intend to
          // process, which is what was blowing through the 30s stage
          // timeout on a mailbox with real history. The client-side
          // `message.uid <= cursor.lastUid` guard below still exists as a
          // belt-and-suspenders check, not as the thing doing the bounding.
          const highestPossibleUid = Number(status.uidNext) - 1;
          const endUid = Math.min(highestPossibleUid, startUid + maxMessages - 1);
          log(`fetch range computed: ${startUid}:${endUid} (highestPossibleUid=${highestPossibleUid})`);

          if (endUid >= startUid) {
            for await (const message of client.fetch(`${startUid}:${endUid}`, { source: true }, { uid: true })) {
              log(`fetched uid=${message.uid} (${message.source?.length ?? 0} bytes)`);
              if (message.uid <= cursor.lastUid) continue;

              if (result.checked >= maxMessages) {
                result.truncated = true;
                break; // Cursor only advances over what was actually processed below.
              }

              result.checked++;
              maxUidSeen = Math.max(maxUidSeen, message.uid);

              const messageStartedAt = Date.now();
              try {
                // Bounded per-message too -- a single unusually large or
                // malformed message (mailparser choking on it, say) would
                // otherwise be able to eat the entire remaining stage budget
                // by itself, taking every message behind it down with it.
                await withTimeout(
                  processMessage(message, { ownMailbox, result, client }),
                  8_000,
                  `process message uid=${message.uid}`
                );
                log(`processed uid=${message.uid} in ${Date.now() - messageStartedAt}ms`);
              } catch (err) {
                log(`error on uid=${message.uid} after ${Date.now() - messageStartedAt}ms: ${err instanceof Error ? err.message : String(err)}`);
                result.errors.push({ uid: message.uid, error: err instanceof Error ? err.message : String(err) });
              }
            }
            log("fetch loop finished");

            // The server may have more mail past what we bounded this poll
            // to -- flag it as truncated so the next run's cursor picks up
            // where this one left off, same as the client-side cap did.
            if (highestPossibleUid > endUid) {
              result.truncated = true;
            }
          } else {
            log("nothing new to fetch (endUid < startUid)");
          }

          if (maxUidSeen > cursor.lastUid) {
            await prisma.imapPollCursor.update({ where: { mailbox: user }, data: { lastUid: maxUidSeen } });
            log(`cursor advanced to lastUid=${maxUidSeen}`);
          }
        } finally {
          lock.release();
          log("mailbox lock released");
        }
      })(),
      // Was 90s. Tightened alongside the maxMessages cut above -- 25
      // messages should comfortably finish well inside 30s, and the whole
      // point now is staying safely under Render's own (unknown, but
      // evidently shorter than 90s+15s+10s) proxy timeout, not just being
      // generous to a large backlog.
      30_000,
      "read and process INBOX messages"
    );
  } finally {
    // logout() itself has no inherent timeout either -- if the connection
    // is already wedged (e.g. the operation above timed out mid-flight),
    // waiting on a graceful logout could hang just as long. Bound it too,
    // falling back to a hard close.
    log("logging out");
    await withTimeout(client.logout(), 5_000, "logout").catch(() => {
      try {
        client.close();
      } catch {
        // Already closed or dead -- nothing left to clean up.
      }
    });
  }

  return result;
}

async function processMessage(
  message: RelayMailMessage,
  ctx: { ownMailbox: string; result: PollResult; client: ImapFlow }
): Promise<void> {
  if (!message.source) {
    ctx.result.unparsed++;
    return;
  }
  const parsedMime = await simpleParser(message.source);
  const bodyText = parsedMime.text || htmlToPlainText(parsedMime.html || undefined);

  // Two kinds of relay notification land in this same mailbox now -- route
  // on the envelope Subject (set by whichever Power Automate flow sent it),
  // not on body content, since a reply's free-text body could coincidentally
  // contain a line that looks like "TOKEN: ...". See relay-send.ts for why
  // SEND_CONFIRMED_SUBJECT_MARKER is the one that identifies a confirmation.
  const isSendConfirmation = (parsedMime.subject || "").includes(SEND_CONFIRMED_SUBJECT_MARKER);

  if (isSendConfirmation) {
    await processSendConfirmation(bodyText, message, ctx);
  } else {
    await processReply(bodyText, message, ctx);
  }

  // Best-effort cosmetic touch so the mailbox itself shows progress if you
  // glance at it in Gmail -- the UID cursor is what actually prevents
  // reprocessing, so a failure here doesn't count as a poll error and
  // doesn't affect whatever match/status update happened above.
  await ctx.client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true }).catch(() => undefined);
}

async function processReply(
  bodyText: string,
  message: RelayMailMessage,
  ctx: { ownMailbox: string; result: PollResult; client: ImapFlow }
): Promise<void> {
  const relay = parseRelayNotification(bodyText);

  if (!relay) {
    ctx.result.unparsed++;
    return;
  }

  // Defensive, mirrors the equivalent check in the old Graph webhook route:
  // skip anything whose relayed From is our own sending mailbox, in case a
  // stray copy of our own outbound mail ever matches the trigger condition.
  if (ctx.ownMailbox && relay.fromEmail === ctx.ownMailbox) {
    ctx.result.ownMailbox++;
    return;
  }

  const match = await findLatestMessageForEmail(relay.fromEmail);
  if (!match) {
    ctx.result.unmatched++;
    return;
  }

  await logEvent(match.id, "REPLY", {
    source: "imap-relay",
    relayFromEmail: relay.fromEmail,
    relayFromName: relay.fromName,
    relaySubject: relay.subject,
    relayReceivedAt: relay.receivedAt ? relay.receivedAt.toISOString() : null,
    imapUid: message.uid,
  });
  await markStatus(match.prospectId, "REPLIED");
  ctx.result.matched++;
}

/**
 * Handles the send-flow's confirmation that a queued outreach email actually
 * went out (see relay-send.ts / send/route.ts): matches it back to the
 * OutreachMessage it belongs to by trackingToken, records sentAt via
 * confirmMessageSent, and advances the prospect from SENDING to SENT.
 *
 * An unmatched token is logged as confirmUnmatched rather than throwing --
 * that's surprising enough to want visible in the poll result (it'd mean the
 * send-flow echoed back a token we never issued, or a message from a much
 * older cursor state), but not worth failing the whole poll run over.
 */
async function processSendConfirmation(
  bodyText: string,
  message: RelayMailMessage,
  ctx: { ownMailbox: string; result: PollResult; client: ImapFlow }
): Promise<void> {
  const confirmation = parseSendConfirmation(bodyText);

  if (!confirmation) {
    ctx.result.unparsed++;
    return;
  }

  const match = await findMessageByToken(confirmation.token);
  if (!match) {
    ctx.result.confirmUnmatched++;
    return;
  }

  await confirmMessageSent(match.id);
  await logEvent(match.id, "SEND_CONFIRMED", {
    source: "imap-relay",
    confirmedAt: confirmation.confirmedAt ? confirmation.confirmedAt.toISOString() : null,
    imapUid: message.uid,
  });
  await markStatus(match.prospectId, "SENT");
  ctx.result.confirmed++;
}
