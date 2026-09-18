import { prisma } from "@/lib/db";
import { Prisma, ProspectStatus, TrackingEventType } from "@prisma/client";

export interface ImportedProspect {
  email: string;
  firstName: string;
  lastName?: string;
  company?: string;
  title?: string;
}

export async function upsertProspects(rows: ImportedProspect[]) {
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

    const existing = await prisma.prospect.findUnique({ where: { email } });
    if (existing) {
      await prisma.prospect.update({
        where: { email },
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

export async function listProspects() {
  return prisma.prospect.findMany({
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
    SENT: 1,
    OPENED: 2,
    CLICKED: 3,
    REPLIED: 4,
    BOUNCED: 4,
  };
  const current = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!current) return;
  if (rank[status] < rank[current.status]) return;
  await prisma.prospect.update({ where: { id: prospectId }, data: { status } });
}

export async function logEvent(
  outreachMessageId: number,
  type: TrackingEventType,
  meta?: Record<string, unknown>
) {
  await prisma.trackingEvent.create({
    data: {
      outreachMessageId,
      type,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}

export async function findMessageByToken(token: string) {
  return prisma.outreachMessage.findUnique({
    where: { trackingToken: token },
    include: { prospect: true },
  });
}

export async function findMessageByConversationId(conversationId: string) {
  return prisma.outreachMessage.findFirst({
    where: { graphConversationId: conversationId },
    include: { prospect: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Matches an inbound reply to a prospect by email address and returns their
 * most recently sent OutreachMessage. Used by the IMAP relay poller, which
 * has no Graph conversationId to match against -- the reply's From address
 * is the only reliable signal the relay notification carries.
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

  const prospect = await prisma.prospect.findUnique({ where: { email } });
  if (!prospect) return null;

  return prisma.outreachMessage.findFirst({
    where: { prospectId: prospect.id },
    include: { prospect: true },
    orderBy: { createdAt: "desc" },
  });
}

export type { Prisma };
