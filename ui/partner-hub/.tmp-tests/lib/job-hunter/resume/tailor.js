"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTailoringPacket = void 0;
const scoring_1 = require("../scoring");
const resumeProfile_1 = require("../resumeProfile");
const variant_1 = require("./variant");
const top = (items, count) => items.slice(0, count);
const toSnapshot = (value, max = 220) => {
    if (!value) {
        return undefined;
    }
    const compact = value.trim().replace(/\s+/g, " ");
    if (compact.length <= max) {
        return compact;
    }
    return `${compact.slice(0, max - 1).trimEnd()}…`;
};
const toTailoringResume = (resume) => {
    if ("name" in resume) {
        return {
            profile: (0, resumeProfile_1.normalizeResumeProfile)({
                fullName: resume.name,
                email: "",
                phone: "",
                cityState: "",
                linkedinUrl: "",
                websiteUrl: "",
                workAuthorizationNote: "",
                signatureLine: "Sincerely,",
                headline: resume.title,
                summary: resume.summary,
                skills: resume.skills,
                experience: resume.experience.map((item) => ({
                    company: item.company,
                    title: item.role,
                    bullets: item.highlights,
                })),
                achievements: resume.achievements,
            }),
            achievements: resume.achievements,
            signatureLine: "Sincerely,",
            signer: resume.name,
        };
    }
    const normalized = (0, resumeProfile_1.normalizeResumeProfile)(resume);
    return {
        profile: normalized,
        achievements: normalized.achievements,
        signatureLine: normalized.signatureLine || "Sincerely,",
        signer: normalized.fullName || "Candidate",
    };
};
const buildCoverLetter = (resume, job, matchedKeywords) => {
    return [
        `Dear Hiring Team,`,
        "",
        `I am excited to apply for the ${job.title} role at ${job.company}. ${resume.profile.summary}`,
        `My background aligns with your focus on ${matchedKeywords.join(", ") || "solutions architecture and customer outcomes"}.`,
        "",
        "In recent roles, I have partnered with sellers and delivery teams to turn business goals into practical technical roadmaps, then stayed engaged through implementation to ensure measurable outcomes.",
        "",
        "Thank you for your consideration. I would welcome the opportunity to discuss how I can help your team accelerate customer success.",
        "",
        resume.signatureLine,
        resume.signer,
    ].join("\n");
};
const generateTailoringPacket = (job, resume, preferences) => {
    const tailoringResume = toTailoringResume(resume);
    const fit = (0, scoring_1.scoreJobFit)(job, preferences);
    const matchedKeywords = fit.matched.map((item) => item.keyword);
    const missingKeywords = fit.missing.map((item) => item.keyword);
    const jobSnapshot = toSnapshot(job.notes);
    const tailoredSummary = `${tailoringResume.profile.summary} Targeting ${job.title} at ${job.company} with emphasis on ${top(matchedKeywords, 3).join(", ") || "partner-facing technical leadership"}.${jobSnapshot ? ` Posting snapshot: ${jobSnapshot}` : ""}`;
    const tailoredBullets = [
        `Direct fit for ${job.title}: proven experience in ${top(matchedKeywords, 2).join(" and ") || "enterprise solution design"}.`,
        `Strong alignment with ${job.company}'s hiring signals: ${top(matchedKeywords, 3).join(", ") || "customer impact and execution"}.${jobSnapshot ? ` Context from posting: ${jobSnapshot}` : ""}`,
        `Address likely gaps proactively by emphasizing readiness in ${top(missingKeywords, 2).join(" and ") || "adjacent areas"}.`,
    ];
    const tailoredResumeVariant = (0, variant_1.generateTailoredResumeVariant)(job, tailoringResume.profile);
    const coverLetterDraft = buildCoverLetter(tailoringResume, job, top(matchedKeywords, 4));
    const screenerAnswers = [
        {
            question: "Why are you interested in this role?",
            answer: `This role combines my core strengths in ${top(matchedKeywords, 3).join(", ") || "solutions and customer outcomes"} and gives me a chance to deliver measurable value for ${job.company}.`,
        },
        {
            question: "Describe your relevant experience.",
            answer: `I bring hands-on experience leading partner-facing and post-sales initiatives, including ${top(tailoringResume.achievements, 1)[0] ?? "cross-functional technical programs"}.`,
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
        "## Tailored Resume Variant Delta",
        ...tailoredResumeVariant.deltaSummary.map((line) => `- ${line}`),
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
        tailoredResumeVariant,
        coverLetterDraft,
        screenerAnswers,
        markdown,
    };
};
exports.generateTailoringPacket = generateTailoringPacket;
