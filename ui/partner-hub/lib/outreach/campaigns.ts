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

export async function updateCampaign(id: number, input: CreateCampaignInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Campaign name is required.");
  }
  return prisma.campaign.update({
    where: { id },
    data: { name, description: input.description?.trim() || null },
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
