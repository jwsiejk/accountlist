import { prisma } from "@/lib/db";
import { computeSequence, DEFAULT_DELAYS, summarizeBatch, type Engagement, type ProspectStatusName } from "@/lib/outreach/sequence";
import type { BatchOverview, CampaignOverview, ContactRow } from "./overviewTypes";

export type { BatchOverview, CampaignOverview, ContactRow } from "./overviewTypes";

/**
 * One read model of a whole campaign -- batches, the contacts in each, every
 * contact's per-email sequence progress, and roll-ups per batch -- shared by
 * the Prospects tab and the Report tab (and the report's CSV export), so they
 * can never disagree about what happened.
 */

function isAutomated(meta: string | null): boolean {
  if (!meta) return false;
  try {
    return JSON.parse(meta)?.automated === true;
  } catch {
    return false;
  }
}

export async function getCampaignOverview(campaignId: number, now: Date = new Date()): Promise<CampaignOverview | null> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return null;

  const [batches, prospects] = await Promise.all([
    prisma.batch.findMany({ where: { campaignId }, orderBy: { createdAt: "asc" } }),
    prisma.prospect.findMany({
      where: { campaignId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            step: true,
            sentAt: true,
            createdAt: true,
            events: { select: { type: true, occurredAt: true, meta: true } },
          },
        },
      },
    }),
  ]);

  const delays = {
    email2DelayDays: campaign.email2DelayDays ?? DEFAULT_DELAYS.email2DelayDays,
    email3DelayDays: campaign.email3DelayDays ?? DEFAULT_DELAYS.email3DelayDays,
  };

  const rows: ContactRow[] = prospects.map((p) => {
    const status = p.status as ProspectStatusName;
    const sequence = computeSequence(
      { status, messages: p.messages.map((m) => ({ step: m.step, sentAt: m.sentAt, createdAt: m.createdAt })) },
      delays,
      now
    );

    const engagement: Engagement = { opened: false, clicked: false, replied: status === "REPLIED" };
    let lastActivityAt: Date | null = null;
    for (const m of p.messages) {
      for (const e of m.events) {
        if (e.type === "REPLY") engagement.replied = true;
        else if (e.type === "OPEN" || e.type === "CLICK") {
          if (isAutomated(e.meta)) continue; // suspected link-scanner, not a person
          if (e.type === "OPEN") engagement.opened = true;
          else engagement.clicked = true;
        } else continue;
        if (!lastActivityAt || e.occurredAt > lastActivityAt) lastActivityAt = e.occurredAt;
      }
    }

    return {
      id: p.id,
      batchId: p.batchId,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      company: p.company,
      title: p.title,
      status,
      sequence,
      engagement,
      lastActivityAt,
      createdAt: p.createdAt,
    };
  });

  const toOverview = (id: number | null, name: string, createdAt: Date | null): BatchOverview => {
    const contacts = rows.filter((r) => r.batchId === id);
    return { id, name, createdAt, contacts, summary: summarizeBatch(contacts) };
  };

  const result: BatchOverview[] = batches.map((b) => toOverview(b.id, b.name, b.createdAt));
  const unassigned = toOverview(null, "Unassigned", null);
  if (unassigned.contacts.length > 0) result.push(unassigned);

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      email2DelayDays: delays.email2DelayDays,
      email3DelayDays: delays.email3DelayDays,
    },
    batches: result,
    summary: summarizeBatch(rows),
  };
}
