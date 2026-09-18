import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import { prisma } from "@/lib/db";
import { findLatestMessageForEmail, logEvent, markStatus } from "@/lib/sc26-outreach/prospects";
import { htmlToPlainText, parseRelayNotification } from "@/lib/sc26-outreach/imap-relay-parser";

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
  errors: { uid: number; error: string }[];
  /** True if this run stopped early because of SC26_IMAP_POLL_MAX_MESSAGES. */
  truncated: boolean;
}

const DEFAULT_MAX_MESSAGES_PER_POLL = 200;

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
    errors: [],
    truncated: false,
  };

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { uidValidity: true });
      const uidValidity = Number(status.uidValidity);

      let cursor = await prisma.imapPollCursor.findUnique({ where: { mailbox: user } });
      if (!cursor || cursor.uidValidity !== uidValidity) {
        // First run ever, or Gmail changed UIDVALIDITY (mailbox recreated --
        // rare, but old UIDs would be meaningless if it happened). Either
        // way, start the cursor fresh rather than guessing.
        cursor = await prisma.imapPollCursor.upsert({
          where: { mailbox: user },
          create: { mailbox: user, uidValidity, lastUid: 0 },
          update: { uidValidity, lastUid: 0 },
        });
      }

      const startUid = cursor.lastUid + 1;
      let maxUidSeen = cursor.lastUid;

      // "N:*" always yields at least the highest existing UID even when
      // nothing new arrived (IMAP semantics for an open-ended range) -- the
      // `message.uid <= cursor.lastUid` guard below is what actually
      // prevents reprocessing, not the range boundary itself.
      for await (const message of client.fetch(`${startUid}:*`, { source: true }, { uid: true })) {
        if (message.uid <= cursor.lastUid) continue;

        if (result.checked >= maxMessages) {
          result.truncated = true;
          break; // Cursor only advances over what was actually processed below.
        }

        result.checked++;
        maxUidSeen = Math.max(maxUidSeen, message.uid);

        try {
          await processMessage(message, { ownMailbox, result, client });
        } catch (err) {
          result.errors.push({ uid: message.uid, error: err instanceof Error ? err.message : String(err) });
        }
      }

      if (maxUidSeen > cursor.lastUid) {
        await prisma.imapPollCursor.update({ where: { mailbox: user }, data: { lastUid: maxUidSeen } });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
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

  // Best-effort cosmetic touch so the mailbox itself shows progress if you
  // glance at it in Gmail -- the UID cursor is what actually prevents
  // reprocessing, so a failure here doesn't count as a poll error and
  // doesn't affect the match/status update above, which already happened.
  await ctx.client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true }).catch(() => undefined);
}
