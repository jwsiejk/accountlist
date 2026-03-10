import { buildFollowUpEmail } from "./applications";
import type { TailoringPacket } from "./resume/tailor";
import type { JobPosting, ResumeProfile } from "./types";

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

const buildSummaryMarkdown = (job: JobPosting, tailoringPacket: TailoringPacket, generatedAt: string, profile?: ResumeProfile) => {
  const candidateName = profile?.fullName?.trim() || "Candidate";
  return [
    "## Application Summary",
    `- **Role:** ${job.title}`,
    `- **Company:** ${job.company}`,
    `- **Job ID:** ${job.id}`,
    `- **Candidate:** ${candidateName}`,
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

export const buildApplyPacket = (job: JobPosting, tailoringPacket: TailoringPacket, profile?: ResumeProfile): ApplyPacket => {
  const generatedAt = new Date().toISOString();
  const fileBaseName = `${normalizeForFileName(job.company)}-${normalizeForFileName(job.title)}-apply-packet`;
  const summaryMarkdown = buildSummaryMarkdown(job, tailoringPacket, generatedAt, profile);
  const coverLetterMarkdown = tailoringPacket.coverLetterDraft;
  const screenerAnswersText = buildScreenerAnswersText(tailoringPacket);
  const followUpEmailText = buildFollowUpEmail(job, profile);

  const fullPacketMarkdown = [
    "# Job Hunter Apply Packet",
    "",
    `- **Company:** ${job.company}`,
    `- **Title:** ${job.title}`,
    `- **Job ID:** ${job.id}`,
    `- **Candidate:** ${profile?.fullName?.trim() || "Candidate"}`,
    `- **Email:** ${profile?.email?.trim() || "(not set)"}`,
    `- **Phone:** ${profile?.phone?.trim() || "(not set)"}`,
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
