import { scoreJobFit } from "../scoring";
import { normalizeResumeProfile } from "../resumeProfile";
import type { JobPosting, ResumeProfile } from "../types";
import type { MasterResume } from "./masterResume";

export type TailoringPacket = {
  jobId: string;
  generatedAt: string;
  fit: ReturnType<typeof scoreJobFit>;
  keywordMap: {
    matched: string[];
    missing: string[];
  };
  tailoredSummary: string;
  tailoredBullets: string[];
  coverLetterDraft: string;
  screenerAnswers: { question: string; answer: string }[];
  markdown: string;
};

const top = (items: string[], count: number) => items.slice(0, count);

type TailoringResume = {
  summary: string;
  achievements: string[];
  signer: string;
};

const toTailoringResume = (resume: MasterResume | ResumeProfile): TailoringResume => {
  if ("name" in resume) {
    return {
      summary: resume.summary,
      achievements: resume.achievements,
      signer: resume.name,
    };
  }

  const normalized = normalizeResumeProfile(resume);
  return {
    summary: normalized.summary,
    achievements: normalized.achievements,
    signer: "Candidate",
  };
};

const buildCoverLetter = (resume: TailoringResume, job: JobPosting, matchedKeywords: string[]) => {
  return [
    `Dear Hiring Team,`,
    "",
    `I am excited to apply for the ${job.title} role at ${job.company}. ${resume.summary}`,
    `My background aligns with your focus on ${matchedKeywords.join(", ") || "solutions architecture and customer outcomes"
    }.`,
    "",
    "In recent roles, I have partnered with sellers and delivery teams to turn business goals into practical technical roadmaps, then stayed engaged through implementation to ensure measurable outcomes.",
    "",
    "Thank you for your consideration. I would welcome the opportunity to discuss how I can help your team accelerate customer success.",
    "",
    `Sincerely,`,
    resume.signer,
  ].join("\n");
};

export const generateTailoringPacket = (job: JobPosting, resume: MasterResume | ResumeProfile): TailoringPacket => {
  const tailoringResume = toTailoringResume(resume);
  const fit = scoreJobFit(job);
  const matchedKeywords = fit.matched.map((item) => item.keyword);
  const missingKeywords = fit.missing.map((item) => item.keyword);

  const tailoredSummary = `${tailoringResume.summary} Targeting ${job.title} at ${job.company} with emphasis on ${top(
    matchedKeywords,
    3,
  ).join(", ") || "partner-facing technical leadership"}.`;

  const tailoredBullets = [
    `Direct fit for ${job.title}: proven experience in ${top(matchedKeywords, 2).join(" and ") || "enterprise solution design"}.`,
    `Strong alignment with ${job.company}'s hiring signals: ${top(matchedKeywords, 3).join(", ") || "customer impact and execution"}.`,
    `Address likely gaps proactively by emphasizing readiness in ${top(missingKeywords, 2).join(" and ") || "adjacent areas"}.`,
  ];

  const coverLetterDraft = buildCoverLetter(tailoringResume, job, top(matchedKeywords, 4));

  const screenerAnswers = [
    {
      question: "Why are you interested in this role?",
      answer: `This role combines my core strengths in ${top(matchedKeywords, 3).join(", ") || "solutions and customer outcomes"
        } and gives me a chance to deliver measurable value for ${job.company}.`,
    },
    {
      question: "Describe your relevant experience.",
      answer: `I bring hands-on experience leading partner-facing and post-sales initiatives, including ${top(
        tailoringResume.achievements,
        1,
      )[0] ?? "cross-functional technical programs"}.`,
    },
    {
      question: "What is one area you are actively strengthening?",
      answer: `I continuously upskill in ${top(missingKeywords, 1)[0] ?? "emerging platform capabilities"} to stay effective in fast-changing environments.`,
    },
  ];

  const markdown = [
    `# Resume Tailoring Packet`,
    "",
    `## Job`,
    `- **Title:** ${job.title}`,
    `- **Company:** ${job.company}`,
    `- **Job ID:** ${job.id}`,
    "",
    `## Fit Score`,
    `- **Score:** ${fit.score}/100`,
    `- **Top matched keywords:** ${matchedKeywords.join(", ") || "None"}`,
    `- **Top missing keywords:** ${missingKeywords.join(", ") || "None"}`,
    "",
    `## Tailored Summary`,
    tailoredSummary,
    "",
    `## Tailored Bullets`,
    ...tailoredBullets.map((bullet) => `- ${bullet}`),
    "",
    `## Cover Letter Draft`,
    coverLetterDraft,
    "",
    `## Common Screener Answers`,
    ...screenerAnswers.map((qa) => `- **${qa.question}**\n  ${qa.answer}`),
  ].join("\n");

  return {
    jobId: job.id,
    generatedAt: new Date().toISOString(),
    fit,
    keywordMap: {
      matched: matchedKeywords,
      missing: missingKeywords,
    },
    tailoredSummary,
    tailoredBullets,
    coverLetterDraft,
    screenerAnswers,
    markdown,
  };
};
