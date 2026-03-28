"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApplyPrepItems = exports.buildApplyPacket = void 0;
const applications_1 = require("./applications");
const docExports_1 = require("./docExports");
const buildSummaryMarkdown = (job, tailoringPacket, generatedAt, profile) => {
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
const buildScreenerAnswersText = (tailoringPacket) => {
    return tailoringPacket.screenerAnswers
        .map((item, index) => `${index + 1}. ${item.question}\n${item.answer}`)
        .join("\n\n");
};
const buildApplyPacket = (job, tailoringPacket, profile) => {
    const generatedAt = new Date().toISOString();
    const fileBaseName = `${(0, docExports_1.normalizeForFileName)(job.company)}-${(0, docExports_1.normalizeForFileName)(job.title)}-apply-packet`;
    const summaryMarkdown = buildSummaryMarkdown(job, tailoringPacket, generatedAt, profile);
    const coverLetterMarkdown = tailoringPacket.coverLetterDraft;
    const screenerAnswersText = buildScreenerAnswersText(tailoringPacket);
    const followUpEmailText = (0, applications_1.buildFollowUpEmail)(job, profile);
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
exports.buildApplyPacket = buildApplyPacket;
const buildApplyPrepItems = (job, applyPacket, tailoringPacket, profile) => {
    const candidateContact = [
        profile?.fullName?.trim() || "Candidate Name",
        profile?.email?.trim() || "candidate@example.com",
        profile?.phone?.trim() || "(000) 000-0000",
        profile?.cityState?.trim() || "City, ST",
    ].join("\n");
    const items = [
        {
            key: "candidateContact",
            label: "Candidate contact block",
            value: candidateContact,
            group: "reference",
            priority: "recommended",
            actionType: "copy",
        },
        {
            key: "linkedinUrl",
            label: "LinkedIn URL",
            value: profile?.linkedinUrl?.trim() || "Add LinkedIn URL",
            group: "reference",
            priority: "recommended",
            actionType: "copy",
        },
        {
            key: "workAuthorization",
            label: "Work authorization note",
            value: profile?.workAuthorizationNote?.trim() || "Add work authorization note",
            group: "reference",
            priority: "recommended",
            actionType: "copy",
        },
        {
            key: "professionalSummary",
            label: "Professional summary / headline",
            value: [profile?.headline?.trim(), tailoringPacket.tailoredSummary].filter(Boolean).join("\n"),
            group: "paste",
            priority: "recommended",
            actionType: "copy",
        },
        {
            key: "tailoredResumeDocx",
            label: "Tailored resume (.docx)",
            value: "Upload-ready tailored resume artifact",
            group: "upload",
            priority: "required-first",
            actionType: "download",
        },
        {
            key: "tailoredResumeMarkdown",
            label: "Tailored resume (markdown)",
            value: tailoringPacket.tailoredResumeVariant.markdown,
            group: "paste",
            priority: "recommended",
            actionType: "copy",
        },
        {
            key: "tailoredResumeText",
            label: "Tailored resume (plain text)",
            value: tailoringPacket.tailoredResumeVariant.plainText,
            group: "paste",
            priority: "recommended",
            actionType: "copy",
        },
        {
            key: "coverLetterDocx",
            label: "Cover letter (.docx)",
            value: "Upload-ready cover letter artifact",
            group: "upload",
            priority: "recommended",
            actionType: "download",
        },
        {
            key: "coverLetter",
            label: "Cover letter",
            value: applyPacket.coverLetterMarkdown,
            group: "paste",
            priority: "recommended",
            actionType: "copy",
        },
        {
            key: "screenerAnswers",
            label: "Screener answers",
            value: applyPacket.screenerAnswersText,
            group: "paste",
            priority: "recommended",
            actionType: "copy",
        },
        {
            key: "sourceApplicationLink",
            label: "Source application link",
            value: job.sourceUrl ?? "Add external application URL",
            group: "final-submit-prep",
            priority: "required-first",
            actionType: "open-link",
        },
    ];
    const provider = job.sourceProvider;
    if (provider === "greenhouse") {
        return items.map((item) => {
            if (item.key === "tailoredResumeDocx") {
                return { ...item, providerHint: "Upload this first in Greenhouse." };
            }
            if (item.key === "coverLetterDocx") {
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
            if (item.key === "coverLetterDocx") {
                return { ...item, providerHint: "Attach cover letter when the role/application requests it." };
            }
            return item;
        });
    }
    return items;
};
exports.buildApplyPrepItems = buildApplyPrepItems;
