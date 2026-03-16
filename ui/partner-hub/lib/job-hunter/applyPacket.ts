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

export type ApplyPrepGroup = "upload" | "paste" | "reference" | "final-submit-prep";

export type ApplyPrepPriority = "required-first" | "recommended";

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
  group: ApplyPrepGroup;
  priority: ApplyPrepPriority;
  providerHint?: string;
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

  const items: ApplyPrepItem[] = [
    {
      key: "candidateContact",
      label: "Candidate contact block",
      value: candidateContact,
      group: "reference",
      priority: "recommended",
    },
    {
      key: "linkedinUrl",
      label: "LinkedIn URL",
      value: profile?.linkedinUrl?.trim() || "Add LinkedIn URL",
      group: "reference",
      priority: "recommended",
    },
    {
      key: "workAuthorization",
      label: "Work authorization note",
      value: profile?.workAuthorizationNote?.trim() || "Add work authorization note",
      group: "reference",
      priority: "recommended",
    },
    {
      key: "professionalSummary",
      label: "Professional summary / headline",
      value: [profile?.headline?.trim(), tailoringPacket.tailoredSummary].filter(Boolean).join("\n"),
      group: "paste",
      priority: "recommended",
    },
    {
      key: "tailoredResumeMarkdown",
      label: "Tailored resume (markdown)",
      value: tailoringPacket.tailoredResumeVariant.markdown,
      group: "upload",
      priority: "required-first",
    },
    {
      key: "tailoredResumeText",
      label: "Tailored resume (plain text)",
      value: tailoringPacket.tailoredResumeVariant.plainText,
      group: "paste",
      priority: "recommended",
    },
    {
      key: "coverLetter",
      label: "Cover letter",
      value: applyPacket.coverLetterMarkdown,
      group: "upload",
      priority: "recommended",
    },
    {
      key: "screenerAnswers",
      label: "Screener answers",
      value: applyPacket.screenerAnswersText,
      group: "paste",
      priority: "recommended",
    },
    {
      key: "sourceApplicationLink",
      label: "Source application link",
      value: job.sourceUrl ?? "Add external application URL",
      group: "final-submit-prep",
      priority: "required-first",
    },
  ];

  const provider = job.sourceProvider;

  if (provider === "greenhouse") {
    return items.map((item) => {
      if (item.key === "tailoredResumeMarkdown") {
        return { ...item, providerHint: "Upload this first in Greenhouse." };
      }
      if (item.key === "coverLetter") {
        return { ...item, priority: "required-first", providerHint: "Attach when Greenhouse asks for a cover letter." };
      }
      if (item.key === "screenerAnswers") {
        return { ...item, priority: "required-first", providerHint: "Paste concise responses into Greenhouse text prompts." };
      }
      return item;
    });
  }

  if (provider === "lever") {
    return items.map((item) => {
      if (item.key === "linkedinUrl") {
        return { ...item, group: "paste", priority: "required-first", providerHint: "Lever commonly asks for LinkedIn/profile links." };
      }
      if (item.key === "screenerAnswers") {
        return { ...item, priority: "required-first", providerHint: "Use these for Lever custom questions." };
      }
      return item;
    });
  }

  if (provider === "ashby") {
    return items.map((item) => {
      if (item.key === "candidateContact") {
        return { ...item, group: "paste", priority: "required-first", providerHint: "Ashby often starts with profile/contact details." };
      }
      if (item.key === "workAuthorization") {
        return { ...item, group: "paste", priority: "required-first", providerHint: "Keep this ready for profile-related fields." };
      }
      return item;
    });
  }

  if (provider === "smartrecruiters") {
    return items.map((item) => {
      if (item.key === "candidateContact") {
        return { ...item, group: "paste", priority: "required-first", providerHint: "SmartRecruiters usually asks for profile/contact info early." };
      }
      if (item.key === "coverLetter") {
        return { ...item, providerHint: "Attach cover letter when the role/application requests it." };
      }
      return item;
    });
  }

  return items;
};
