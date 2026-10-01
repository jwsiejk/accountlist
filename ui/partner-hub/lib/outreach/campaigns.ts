import { prisma } from "@/lib/db";

/**
 * Campaigns are the top-level grouping the rest of the outreach module is
 * scoped under -- each has its own prospect list and its own templates, but
 * all share the one send/reply infrastructure (relay mailbox, Power
 * Automate flows, IMAP poller). See docs/OUTREACH_SETUP.md.
 */

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
}

export async function listCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { prospects: true, templates: true } },
    },
  });
  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    createdAt: c.createdAt,
    prospectCount: c._count.prospects,
    templateCount: c._count.templates,
  }));
}

export async function getCampaign(id: number) {
  return prisma.campaign.findUnique({ where: { id } });
}

export async function createCampaign(input: CreateCampaignInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Campaign name is required.");
  }
  return prisma.campaign.create({
    data: { name, description: input.description?.trim() || null },
  });
}

export interface UpdateCampaignInput extends CreateCampaignInput {
  /** Suggested days between Email 1 sent and Email 2 due (0-60). */
  email2DelayDays?: number;
  /** Suggested days between Email 2 sent and Email 3 due (0-60). */
  email3DelayDays?: number;
}

function validDelay(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0 || value > 60) {
    throw new Error(`${label} must be a whole number of days between 0 and 60.`);
  }
  return value;
}

export async function updateCampaign(id: number, input: UpdateCampaignInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Campaign name is required.");
  }
  const email2DelayDays = validDelay(input.email2DelayDays, "Email 2 delay");
  const email3DelayDays = validDelay(input.email3DelayDays, "Email 3 delay");
  return prisma.campaign.update({
    where: { id },
    data: {
      name,
      description: input.description?.trim() || null,
      ...(email2DelayDays !== undefined ? { email2DelayDays } : {}),
      ...(email3DelayDays !== undefined ? { email3DelayDays } : {}),
    },
  });
}

/**
 * Cascades (schema-level onDelete: Cascade) to every Prospect, Template,
 * OutreachMessage, and TrackingEvent under this campaign -- there is no
 * "soft" delete here. The dashboard should confirm with the person before
 * calling this, same as any other irreversible action.
 */
export async function deleteCampaign(id: number) {
  await prisma.campaign.delete({ where: { id } });
}
