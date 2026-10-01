import { prisma } from "@/lib/db";

/**
 * Email templates, scoped to a campaign and stored in the DB -- replacing
 * the earlier file-based library (lib/outreach/templates/index.ts +
 * one-file-per-template), which meant changing copy required a code change
 * and a redeploy. Now a person creates/edits/deletes these directly from
 * the dashboard; `html`/`subject` still carry the same {{PLACEHOLDER}}
 * merge tokens as before (see merge.ts), unmerged, so a template's raw
 * source round-trips through the edit UI losslessly.
 */

export interface TemplateInput {
  campaignId: number;
  name: string;
  subject: string;
  html: string;
  /** Which sequence email this is (1, 2 or 3), or null/undefined if it isn't one. */
  sequenceStep?: number | null;
}

export async function listTemplates(campaignId: number) {
  return prisma.template.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTemplate(id: number) {
  return prisma.template.findUnique({ where: { id } });
}

function validate(input: Pick<TemplateInput, "name" | "subject" | "html" | "sequenceStep">) {
  if (!input.name.trim()) throw new Error("Template name is required.");
  if (!input.subject.trim()) throw new Error("Subject is required.");
  if (!input.html.trim()) throw new Error("Email body is required.");
  if (input.sequenceStep != null && ![1, 2, 3].includes(input.sequenceStep)) {
    throw new Error("Sequence step must be 1, 2 or 3 (or none).");
  }
}

export async function createTemplate(input: TemplateInput) {
  validate(input);
  return prisma.template.create({
    data: {
      campaignId: input.campaignId,
      name: input.name.trim(),
      subject: input.subject.trim(),
      html: input.html,
      sequenceStep: input.sequenceStep ?? null,
    },
  });
}

export async function updateTemplate(
  id: number,
  input: Pick<TemplateInput, "name" | "subject" | "html" | "sequenceStep">
) {
  validate(input);
  return prisma.template.update({
    where: { id },
    data: {
      name: input.name.trim(),
      subject: input.subject.trim(),
      html: input.html,
      // undefined = leave unchanged; null = clear it.
      ...(input.sequenceStep !== undefined ? { sequenceStep: input.sequenceStep } : {}),
    },
  });
}

export async function deleteTemplate(id: number) {
  await prisma.template.delete({ where: { id } });
}
