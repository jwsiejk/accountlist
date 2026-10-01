import { prisma } from "@/lib/db";

/**
 * Batches: Campaign -> Batch -> Prospect. A batch is one named round of
 * outreach ("the customers I emailed in this round"). See the Batch model in
 * prisma/schema.prisma for how membership works.
 */

export class BatchError extends Error {}

function cleanName(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ");
}

/** "Batch 1", "Batch 2", ... -- the first unused number in this campaign. */
async function nextAutoName(campaignId: number): Promise<string> {
  const existing = await prisma.batch.findMany({ where: { campaignId }, select: { name: true } });
  const taken = new Set(existing.map((b) => b.name.toLowerCase()));
  for (let n = existing.length + 1; ; n++) {
    const candidate = `Batch ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

export async function createBatch(campaignId: number, name?: string | null) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
  if (!campaign) throw new BatchError("Campaign not found.");

  const finalName = cleanName(name) || (await nextAutoName(campaignId));
  try {
    return await prisma.batch.create({ data: { campaignId, name: finalName } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new BatchError(`A batch named "${finalName}" already exists in this campaign.`);
    throw err;
  }
}

export async function renameBatch(id: number, name: string) {
  const finalName = cleanName(name);
  if (!finalName) throw new BatchError("Batch name is required.");
  try {
    return await prisma.batch.update({ where: { id }, data: { name: finalName } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new BatchError(`A batch named "${finalName}" already exists in this campaign.`);
    throw err;
  }
}

/**
 * Deletes only the batch itself. Its contacts are NOT deleted -- the schema's
 * onDelete: SetNull leaves them in the campaign as "Unassigned", with all
 * their email history intact, so they can be moved into another batch.
 */
export async function deleteBatch(id: number) {
  await prisma.batch.delete({ where: { id } });
}
