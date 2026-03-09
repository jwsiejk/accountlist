import { buildFollowUpEmail } from "./applications";
import type { TailoringPacket } from "./resume/tailor";
import type { JobPosting } from "./types";

export type ApplyPacket = {
  jobId: string;
  generatedAt: string;
  fileBaseName: string;
  summaryMarkdown: string;
  coverLetterMarkdown: string;
  screenerAnswersText: string;
  followUpEmailText: string;
  fullPacketMarkdown: string;
};

const normalizeForFileName = (value: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "untitled";
};

const buildSummaryMarkdown = (job: JobPosting, tailoringPacket: TailoringPacket, generatedAt: string) => {
  return [
    "## Application Summary",
    `- **Role:** ${job.title}`,
    `- **Company:** ${job.company}`,
    `- **Job ID:** ${job.id}`,
    `- **Generated:** ${generatedAt}`,
    "",
    "### Tailored Snapshot",
    tailoringPacket.tailoredSummary,
    "",
    "### Suggested Resume Bullets",
    ...tailoringPacket.tailoredBullets.map((bullet) => `- ${bullet}`),
  ].join("\n");
};

const buildScreenerAnswersText = (tailoringPacket: TailoringPacket) => {
  return tailoringPacket.screenerAnswers
    .map((item, index) => `${index + 1}. ${item.question}\n${item.answer}`)
    .join("\n\n");
};

export const buildApplyPacket = (job: JobPosting, tailoringPacket: TailoringPacket): ApplyPacket => {
  const generatedAt = new Date().toISOString();
  const fileBaseName = `${normalizeForFileName(job.company)}-${normalizeForFileName(job.title)}-apply-packet`;
  const summaryMarkdown = buildSummaryMarkdown(job, tailoringPacket, generatedAt);
  const coverLetterMarkdown = tailoringPacket.coverLetterDraft;
  const screenerAnswersText = buildScreenerAnswersText(tailoringPacket);
  const followUpEmailText = buildFollowUpEmail(job);

  const fullPacketMarkdown = [
    "# Job Hunter Apply Packet",
    "",
    `- **Company:** ${job.company}`,
    `- **Title:** ${job.title}`,
    `- **Job ID:** ${job.id}`,
    `- **Generated At:** ${generatedAt}`,
    "",
    summaryMarkdown,
    "",
    "## Cover Letter",
    coverLetterMarkdown,
    "",
    "## Screener Answers",
    screenerAnswersText,
    "",
    "## Follow-up Email",
    followUpEmailText,
  ].join("\n");

  return {
    jobId: job.id,
    generatedAt,
    fileBaseName,
    summaryMarkdown,
    coverLetterMarkdown,
    screenerAnswersText,
    followUpEmailText,
    fullPacketMarkdown,
  };
};
