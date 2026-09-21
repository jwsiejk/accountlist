import { prisma } from "@/lib/db";
import { Prisma, ProspectStatus, TrackingEventType } from "@prisma/client";

export interface ImportedProspect {
  email: string;
  firstName: string;
  lastName?: string;
  company?: string;
  title?: string;
}

export async function upsertProspects(campaignId: number, rows: ImportedProspect[]) {
  let created = 0;
  let updated = 0;
  const skipped: { row: ImportedProspect; reason: string }[] = [];

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      skipped.push({ row, reason: "missing/invalid email" });
      continue;
    }
    if (!row.firstName?.trim()) {
      skipped.push({ row, reason: "missing first name" });
      continue;
    }

    // Unique per (campaignId, email), not email alone -- the same person
    // can be a prospect in more than one campaign at once.
    const existing = await prisma.prospect.findUnique({
      where: { campaignId_email: { campaignId, email } },
    });
    if (existing) {
      await prisma.prospect.update({
        where: { campaignId_email: { campaignId, email } },
        data: {
          firstName: row.firstName.trim(),
          lastName: row.lastName?.trim() || existing.lastName,
          company: row.company?.trim() || existing.company,
          title: row.title?.trim() || existing.title,
        },
      });
      updated++;
    } else {
      await prisma.prospect.create({
        data: {
          campaignId,
          email,
          firstName: row.firstName.trim(),
          lastName: row.lastName?.trim() || null,
          company: row.company?.trim() || null,
          title: row.title?.trim() || null,
        },
      });
      created++;
    }
  }

  return { created, updated, skipped };
}

/**
 * Full audit trail for one prospect: every OutreachMessage ever sent to
 * them (not just the latest, unlike listProspects' summary view) and every
 * TrackingEvent logged against each -- including events flagged
 * `automated` by classifyTrackingEvent, which listProspects' status column
 * silently excludes from advancing status. Nothing is hidden here; this is
 * the "what actually happened, in order" view.
 */
export async function getProspectHistory(prospectId: number) {
  return prisma.prospect.findUnique({
    where: { id: prospectId },
    include: {
      campaign: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          events: { orderBy: { occurredAt: "asc" } },
        },
      },
    },
  });
}

export async function listProspects(campaignId: number) {
  return prisma.prospect.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { events: true },
      },
    },
  });
}

export async function markStatus(prospectId: number, status: ProspectStatus) {
  // Never downgrade a status once a stronger signal has been seen
  // (e.g. a click arriving after a reply shouldn't demote the row).
  const rank: Record<ProspectStatus, number> = {
    PENDING: 0,
    SENDING: 1,
    SENT: 2,
    OPENED: 3,
    CLICKED: 4,
    REPLIED: 5,
    BOUNCED: 5,
  };
  const current = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!current) return;
  if (rank[status] < rank[current.status]) return;
  await prisma.prospect.update({ where: { id: prospectId }, data: { status } });
}

/**
 * Manual escape hatch for a prospect stuck at SENDING (or BOUNCED, or any
 * other non-terminal state) after a failed or misconfigured send attempt --
 * e.g. the relay/flow never actually reached the prospect, so there's
 * nothing real to preserve. Deliberately bypasses markStatus's rank guard
 * (which refuses to downgrade a status), since this exists specifically to
 * downgrade back to PENDING so the dashboard's checkboxes -- which only
 * allow selecting PENDING rows for a new send -- unlock again. Before this
 * existed, the only way to unstick a row was editing the database directly
 * (e.g. via `npx prisma studio`).
 *
 * Does not touch existing OutreachMessage rows -- those stay as history of
 * the earlier attempt; a subsequent send just creates a new one with a new
 * tracking token, same as any other send.
 */
export async function resetProspectsToPending(prospectIds: number[]) {
  const result = await prisma.prospect.updateMany({
    where: { id: { in: prospectIds } },
    data: { status: "PENDING" },
  });
  return result.count;
}

/**
 * `occurredAt` lets a caller backdate the event to when it *actually*
 * happened rather than when we found out about it -- e.g. the IMAP poller
 * only learns about a send-confirmation or a reply whenever it next polls
 * (every few minutes), well after the real event, and defaulting to "now"
 * there produces a history timeline where a message's tracking-pixel/
 * booking-link hits (logged live, the instant they happen) can appear to
 * predate its own "Sent"/"Send confirmed" entries -- confusing, since nothing
 * was actually clicked before the email went out. Omit it (as every
 * synchronous call, e.g. the track/open and track/click routes, already
 * does) to fall back to the DB's own now().
 */
export async function logEvent(
  outreachMessageId: number,
  type: TrackingEventType,
  meta?: Record<string, unknown>,
  occurredAt?: Date
) {
  await prisma.trackingEvent.create({
    data: {
      outreachMessageId,
      type,
      meta: meta ? JSON.stringify(meta) : null,
      ...(occurredAt ? { occurredAt } : {}),
    },
  });
}

export async function findMessageByToken(token: string) {
  return prisma.outreachMessage.findUnique({
    where: { trackingToken: token },
    include: { prospect: true },
  });
}

/**
 * Matches an inbound reply to a prospect by email address and returns their
 * most recently sent OutreachMessage. Used by the IMAP relay poller, which
 * has no conversation id to match against -- the reply's From address is
 * the only reliable signal the relay notification carries.
 *
 * Since a prospect's email is only unique *within* a campaign (the same
 * person can be a prospect in more than one at once), this matches by
 * email across ALL campaigns and picks whichever OutreachMessage was sent
 * most recently overall. That's the reasonable default for one shared
 * relay mailbox with no per-campaign reply address -- it's ambiguous only
 * in the (expected to be rare) case of a genuinely concurrent outreach to
 * the same person in two campaigns at once, where a reply would be
 * attributed to whichever campaign emailed them more recently.
 *
 * All Prospect rows are stored with lowercased, trimmed emails (see
 * upsertProspects above), so the input is normalized the same way before
 * the lookup rather than relying on a case-insensitive query -- SQLite's
 * default TEXT collation is case-sensitive, so `equals`/`mode: "insensitive"`
 * would not do what it does on Postgres.
 */
export async function findLatestMessageForEmail(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return null;

  return prisma.outreachMessage.findFirst({
    where: { prospect: { email } },
    include: { prospect: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Records that a dispatched send-request was actually confirmed sent by the
 * Power Automate send-flow (see relay-send.ts). Separate from markStatus's
 * status-only update because this also needs to set the OutreachMessage's
 * own sentAt, which was left null at dispatch time specifically because it
 * wasn't true yet -- send/route.ts creates the row with sentAt: null and
 * status SENDING the moment it *requests* a send, since there's no
 * synchronous confirmation the way Graph's sendMail used to give one.
 *
 * `confirmedAt` (from the send-flow's own confirmation email, when it
 * includes one -- see parseSendConfirmation) is preferred over "now" for
 * the same reason logEvent's occurredAt param exists: the IMAP poller only
 * notices the confirmation whenever it next polls, which can be minutes
 * after the real send, so defaulting to "now" here understates how early
 * the message actually went out relative to a tracking-pixel/booking-link
 * hit logged live at the real moment it happened.
 */
export async function confirmMessageSent(outreachMessageId: number, confirmedAt?: Date) {
  return prisma.outreachMessage.update({
    where: { id: outreachMessageId },
    data: { sentAt: confirmedAt ?? new Date() },
  });
}

export type { Prisma };
