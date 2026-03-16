import type { ApplyPrepGroup, ApplyPrepItem, ApplyPrepPriority } from "./applyPacket";
import type { BoardType, GuidedApplyWorkflow, JobPosting } from "./types";

export type ApplyHandoffProvider = BoardType | "generic";

export type ApplyHandoffPlan = {
  provider: ApplyHandoffProvider;
  providerLabel: string;
  likelySteps: string[];
  prepHints: string[];
  recommendedArtifacts: string[];
  recommendedCopyItems: string[];
  groupedPrepItems: Array<{
    group: ApplyPrepGroup;
    label: string;
    items: ApplyPrepItem[];
  }>;
};

export type ApplyReadinessSummary = {
  resumeReady: boolean;
  coverLetterReady: boolean;
  candidateProfileReady: boolean;
  providerHandoffReady: boolean;
};

const GROUP_LABELS: Record<ApplyPrepGroup, string> = {
  upload: "Upload",
  paste: "Paste",
  reference: "Reference",
  "final-submit-prep": "Final submit prep",
};

const PROVIDER_LABELS: Record<ApplyHandoffProvider, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  smartrecruiters: "SmartRecruiters",
  generic: "Generic application portal",
};

const PROVIDER_STEP_TEMPLATES: Record<ApplyHandoffProvider, string[]> = {
  greenhouse: [
    "Open Greenhouse application and upload tailored resume first.",
    "Attach cover letter when requested.",
    "Paste prepared screener/custom answers.",
    "Verify contact/work authorization details before final submit.",
  ],
  lever: [
    "Open Lever application and upload tailored resume first.",
    "Confirm LinkedIn/profile links and contact details.",
    "Paste prepared answers for custom questions.",
    "Review each section, then submit manually.",
  ],
  ashby: [
    "Open Ashby application and complete profile/contact fields.",
    "Upload tailored resume and include cover letter when asked.",
    "Paste prepared responses for authored questions.",
    "Review all sections and submit manually.",
  ],
  smartrecruiters: [
    "Open SmartRecruiters and complete profile/contact details.",
    "Upload tailored resume first and cover letter when relevant.",
    "Paste prepared answers into additional text fields.",
    "Confirm final review checklist and submit manually.",
  ],
  generic: [
    "Open external application.",
    "Upload tailored resume and attach cover letter if requested.",
    "Paste prepared answers and profile details.",
    "Run final review and submit manually.",
  ],
};

const PROVIDER_HINTS: Record<ApplyHandoffProvider, string[]> = {
  greenhouse: [
    "Greenhouse flows usually prioritize resume upload and then custom text prompts.",
    "Keep concise answer blocks ready for open text fields.",
  ],
  lever: [
    "Lever often asks for profile links and short custom answers.",
    "Double-check LinkedIn URL formatting before submit.",
  ],
  ashby: [
    "Ashby forms commonly include profile sections before question prompts.",
    "Prepare contact + authorization copy so profile completion is fast.",
  ],
  smartrecruiters: [
    "SmartRecruiters often includes profile/contact setup during apply.",
    "Have both upload assets and paste-ready profile content prepared.",
  ],
  generic: ["No provider-specific structure detected, so use the generic handoff path."],
};

const PROVIDER_RECOMMENDED_ARTIFACTS: Record<ApplyHandoffProvider, string[]> = {
  greenhouse: ["Tailored resume (.docx)", "Cover letter (.docx, if used)", "Apply packet markdown"],
  lever: ["Tailored resume (.docx)", "Apply packet markdown"],
  ashby: ["Tailored resume (.docx)", "Cover letter (.docx, if requested)", "Apply packet markdown"],
  smartrecruiters: ["Tailored resume (.docx)", "Cover letter (.docx, if requested)", "Apply packet markdown"],
  generic: ["Tailored resume (.docx)", "Apply packet markdown"],
};

const PLACEHOLDER_PATTERNS = [/^add\s/i, /^candidate name$/i, /^candidate@example\.com$/i, /^\(000\) 000-0000$/i, /^city, st$/i];

const PROVIDER_REQUIRED_KEYS: Record<ApplyHandoffProvider, ApplyPrepItem["key"][]> = {
  greenhouse: ["tailoredResumeMarkdown", "screenerAnswers", "sourceApplicationLink"],
  lever: ["tailoredResumeMarkdown", "linkedinUrl", "screenerAnswers", "sourceApplicationLink"],
  ashby: ["candidateContact", "tailoredResumeMarkdown", "sourceApplicationLink"],
  smartrecruiters: ["candidateContact", "tailoredResumeMarkdown", "sourceApplicationLink"],
  generic: ["tailoredResumeMarkdown", "sourceApplicationLink"],
};

const isPlaceholderValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const getProvider = (job: JobPosting): ApplyHandoffProvider => job.sourceProvider ?? "generic";

const sortByPriority = (items: ApplyPrepItem[]) => {
  const priorityWeight: Record<ApplyPrepPriority, number> = {
    "required-first": 0,
    recommended: 1,
  };

  return [...items].sort((a, b) => {
    const priorityDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.label.localeCompare(b.label);
  });
};

export const buildApplyHandoffPlan = (job: JobPosting, prepItems: ApplyPrepItem[]): ApplyHandoffPlan => {
  const provider = getProvider(job);
  const groupOrder: ApplyPrepGroup[] = ["upload", "paste", "reference", "final-submit-prep"];

  const groupedPrepItems = groupOrder
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      items: sortByPriority(prepItems.filter((item) => item.group === group)),
    }))
    .filter((group) => group.items.length > 0);

  const recommendedCopyItems = prepItems
    .filter((item) => item.group !== "upload" && !isPlaceholderValue(item.value))
    .map((item) => item.label);

  return {
    provider,
    providerLabel: PROVIDER_LABELS[provider],
    likelySteps: PROVIDER_STEP_TEMPLATES[provider],
    prepHints: PROVIDER_HINTS[provider],
    recommendedArtifacts: PROVIDER_RECOMMENDED_ARTIFACTS[provider],
    recommendedCopyItems,
    groupedPrepItems,
  };
};

export const buildApplyReadinessSummary = (
  job: JobPosting,
  prepItems: ApplyPrepItem[],
  workflow?: GuidedApplyWorkflow,
): ApplyReadinessSummary => {
  const provider = getProvider(job);
  const byKey = Object.fromEntries(prepItems.map((item) => [item.key, item]));
  const hasReady = (key: ApplyPrepItem["key"]) => {
    const item = byKey[key];
    return Boolean(item && !isPlaceholderValue(item.value));
  };

  const resumeReady = Boolean(workflow?.tailoredResumeReady) || hasReady("tailoredResumeMarkdown") || hasReady("tailoredResumeText");
  const coverLetterReady = Boolean(workflow?.coverLetterReady) || hasReady("coverLetter");
  const candidateProfileReady = hasReady("candidateContact") && hasReady("linkedinUrl") && hasReady("workAuthorization");
  const providerHandoffReady = PROVIDER_REQUIRED_KEYS[provider].every((key) => hasReady(key));

  return {
    resumeReady,
    coverLetterReady,
    candidateProfileReady,
    providerHandoffReady,
  };
};
