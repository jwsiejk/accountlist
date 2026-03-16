import { buildFollowUpEmail } from "./applications";
import { normalizeForFileName } from "./docExports";
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

export type ApplyPrepItem = {
  key:
    | "candidateContact"
    | "linkedinUrl"
    | "workAuthorization"
    | "professionalSummary"
    | "tailoredResumeMarkdown"
    | "tailoredResumeText"
    | "coverLetter"
    | "screenerAnswers"
    | "sourceApplicationLink";
  label: string;
  value: string;
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
    "",
    "### Tailored Resume Delta",
    ...tailoringPacket.tailoredResumeVariant.deltaSummary.map((line) => `- ${line}`),
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

export const buildApplyPrepItems = (job: JobPosting, applyPacket: ApplyPacket, tailoringPacket: TailoringPacket, profile?: ResumeProfile): ApplyPrepItem[] => {
  const candidateContact = [
    profile?.fullName?.trim() || "Candidate Name",
    profile?.email?.trim() || "candidate@example.com",
    profile?.phone?.trim() || "(000) 000-0000",
    profile?.cityState?.trim() || "City, ST",
  ].join("\n");

  return [
    {
      key: "candidateContact",
      label: "Candidate contact block",
      value: candidateContact,
    },
    {
      key: "linkedinUrl",
      label: "LinkedIn URL",
      value: profile?.linkedinUrl?.trim() || "Add LinkedIn URL",
    },
    {
      key: "workAuthorization",
      label: "Work authorization note",
      value: profile?.workAuthorizationNote?.trim() || "Add work authorization note",
    },
    {
      key: "professionalSummary",
      label: "Professional summary / headline",
      value: [profile?.headline?.trim(), tailoringPacket.tailoredSummary].filter(Boolean).join("\n"),
    },
    {
      key: "tailoredResumeMarkdown",
      label: "Tailored resume (markdown)",
      value: tailoringPacket.tailoredResumeVariant.markdown,
    },
    {
      key: "tailoredResumeText",
      label: "Tailored resume (plain text)",
      value: tailoringPacket.tailoredResumeVariant.plainText,
    },
    {
      key: "coverLetter",
      label: "Cover letter",
      value: applyPacket.coverLetterMarkdown,
    },
    {
      key: "screenerAnswers",
      label: "Screener answers",
      value: applyPacket.screenerAnswersText,
    },
    {
      key: "sourceApplicationLink",
      label: "Source application link",
      value: job.sourceUrl ?? "Add external application URL",
    },
  ];
};
