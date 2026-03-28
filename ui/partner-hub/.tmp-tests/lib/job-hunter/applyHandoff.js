"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApplyReadinessSummary = exports.buildApplyHandoffPlan = void 0;
const GROUP_LABELS = {
    upload: "Upload",
    paste: "Paste",
    reference: "Reference",
    "final-submit-prep": "Final submit prep",
};
const PROVIDER_LABELS = {
    greenhouse: "Greenhouse",
    lever: "Lever",
    ashby: "Ashby",
    smartrecruiters: "SmartRecruiters",
    generic: "Generic application portal",
};
const PROVIDER_STEP_TEMPLATES = {
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
const PROVIDER_HINTS = {
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
const PROVIDER_RECOMMENDED_ARTIFACTS = {
    greenhouse: ["Tailored resume (.docx)", "Cover letter (.docx, if used)", "Apply packet markdown"],
    lever: ["Tailored resume (.docx)", "Apply packet markdown"],
    ashby: ["Tailored resume (.docx)", "Cover letter (.docx, if requested)", "Apply packet markdown"],
    smartrecruiters: ["Tailored resume (.docx)", "Cover letter (.docx, if requested)", "Apply packet markdown"],
    generic: ["Tailored resume (.docx)", "Apply packet markdown"],
};
const PLACEHOLDER_PATTERNS = [/^add\s/i, /^candidate name$/i, /^candidate@example\.com$/i, /^\(000\) 000-0000$/i, /^city, st$/i];
const PROVIDER_REQUIRED_KEYS = {
    greenhouse: ["tailoredResumeDocx", "screenerAnswers", "sourceApplicationLink"],
    lever: ["tailoredResumeDocx", "linkedinUrl", "screenerAnswers", "sourceApplicationLink"],
    ashby: ["candidateContact", "tailoredResumeDocx", "sourceApplicationLink"],
    smartrecruiters: ["candidateContact", "tailoredResumeDocx", "sourceApplicationLink"],
    generic: ["tailoredResumeDocx", "sourceApplicationLink"],
};
const isPlaceholderValue = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return true;
    }
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
};
const getProvider = (job) => job.sourceProvider ?? "generic";
const sortByPriority = (items) => {
    const priorityWeight = {
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
const buildApplyHandoffPlan = (job, prepItems) => {
    const provider = getProvider(job);
    const groupOrder = ["upload", "paste", "reference", "final-submit-prep"];
    const groupedPrepItems = groupOrder
        .map((group) => ({
        group,
        label: GROUP_LABELS[group],
        items: sortByPriority(prepItems.filter((item) => item.group === group)),
    }))
        .filter((group) => group.items.length > 0);
    const recommendedCopyItems = prepItems
        .filter((item) => item.actionType === "copy" && !isPlaceholderValue(item.value))
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
exports.buildApplyHandoffPlan = buildApplyHandoffPlan;
const buildApplyReadinessSummary = (job, prepItems, workflow) => {
    const provider = getProvider(job);
    const byKey = Object.fromEntries(prepItems.map((item) => [item.key, item]));
    const hasReady = (key) => {
        const item = byKey[key];
        return Boolean(item && !isPlaceholderValue(item.value));
    };
    const resumeReady = Boolean(workflow?.tailoredResumeReady) || hasReady("tailoredResumeDocx");
    const coverLetterReady = Boolean(workflow?.coverLetterReady) || hasReady("coverLetterDocx");
    const candidateProfileReady = hasReady("candidateContact") && hasReady("linkedinUrl") && hasReady("workAuthorization");
    const providerHandoffReady = PROVIDER_REQUIRED_KEYS[provider].every((key) => hasReady(key));
    return {
        resumeReady,
        coverLetterReady,
        candidateProfileReady,
        providerHandoffReady,
    };
};
exports.buildApplyReadinessSummary = buildApplyReadinessSummary;
