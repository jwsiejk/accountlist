"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTailoredResumeVariant = void 0;
const resumeProfile_1 = require("../resumeProfile");
const tokenize = (input) => {
    if (!input) {
        return [];
    }
    const matches = input.toLowerCase().match(/[a-z0-9+#.-]+/g);
    return matches ?? [];
};
const unique = (items) => Array.from(new Set(items));
const scoreTextRelevance = (text, roleTokens) => {
    const contentTokens = tokenize(text);
    let score = 0;
    for (const token of roleTokens) {
        if (token.length < 3) {
            continue;
        }
        if (contentTokens.includes(token)) {
            score += 1;
        }
    }
    return score;
};
const getRoleTokens = (job) => {
    return unique(tokenize([job.title, job.department, job.notes].filter(Boolean).join(" "))).slice(0, 30);
};
const prioritizeSkills = (skills, roleTokens) => {
    return [...skills]
        .map((skill, index) => ({
        skill,
        index,
        score: scoreTextRelevance(skill, roleTokens),
    }))
        .sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.index - b.index;
    })
        .map((item) => item.skill);
};
const selectExperienceBullets = (experience, roleTokens) => {
    return experience.map((entry) => {
        const ranked = entry.bullets
            .map((bullet, index) => ({
            bullet,
            index,
            score: scoreTextRelevance(`${entry.title} ${entry.company} ${bullet}`, roleTokens),
        }))
            .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.index - b.index;
        });
        const selected = ranked.filter((item, index) => item.score > 0 || index === 0).slice(0, 3).map((item) => item.bullet);
        const suppressed = entry.bullets.filter((bullet) => !selected.includes(bullet));
        return {
            ...entry,
            selectedBullets: selected,
            suppressedBullets: suppressed,
        };
    });
};
const buildDeltaSummary = (profile, tailoredHeadline, prioritizedSkills, selectedCount) => {
    const summary = [];
    if (tailoredHeadline !== (profile.headline || "")) {
        summary.push(`Adjusted headline to emphasize role alignment: ${tailoredHeadline}.`);
    }
    const changedSkills = prioritizedSkills.slice(0, 3);
    if (changedSkills.length > 0) {
        summary.push(`Prioritized existing skills for this role: ${changedSkills.join(", ")}.`);
    }
    summary.push(`Selected ${selectedCount} existing experience bullets and suppressed lower-relevance bullets in this variant only.`);
    summary.push("Base resume profile remains unchanged and is still the source of truth.");
    return summary;
};
const toMarkdown = (profile, variant) => {
    return [
        "# Tailored Resume Variant",
        "",
        `- Job ID: ${variant.jobId}`,
        `- Generated: ${variant.generatedAt}`,
        `- Base profile modified: No`,
        "",
        "## Identity",
        `- Name: ${profile.fullName || "(not set)"}`,
        `- Headline: ${variant.tailoredHeadline || "(not set)"}`,
        `- Email: ${profile.email || "(not set)"}`,
        `- Phone: ${profile.phone || "(not set)"}`,
        `- Location: ${profile.cityState || "(not set)"}`,
        "",
        "## Summary",
        variant.tailoredSummary,
        "",
        "## Skills (prioritized)",
        ...(variant.prioritizedSkills.length > 0 ? variant.prioritizedSkills.map((skill) => `- ${skill}`) : ["- (none)"]),
        "",
        "## Experience (prioritized existing bullets)",
        ...variant.experience.flatMap((entry) => [
            `- **${entry.title || "Role"}**, ${entry.company || "Company"}`,
            ...entry.selectedBullets.map((bullet) => `  - ${bullet}`),
        ]),
        "",
        "## Tailoring Delta Summary",
        ...variant.deltaSummary.map((line) => `- ${line}`),
    ].join("\n");
};
const toPlainText = (profile, variant) => {
    return [
        "TAILORED RESUME VARIANT",
        `Job ID: ${variant.jobId}`,
        `Generated: ${variant.generatedAt}`,
        "Base profile modified: No",
        "",
        `Name: ${profile.fullName || "(not set)"}`,
        `Headline: ${variant.tailoredHeadline || "(not set)"}`,
        "",
        "Summary:",
        variant.tailoredSummary,
        "",
        "Skills (prioritized):",
        ...(variant.prioritizedSkills.length > 0 ? variant.prioritizedSkills.map((skill) => `- ${skill}`) : ["- (none)"]),
        "",
        "Experience (selected bullets):",
        ...variant.experience.flatMap((entry) => [
            `* ${entry.title || "Role"} @ ${entry.company || "Company"}`,
            ...entry.selectedBullets.map((bullet) => `  - ${bullet}`),
        ]),
        "",
        "Tailoring Delta Summary:",
        ...variant.deltaSummary.map((line) => `- ${line}`),
    ].join("\n");
};
const generateTailoredResumeVariant = (job, resume) => {
    const profile = (0, resumeProfile_1.normalizeResumeProfile)(resume);
    const roleTokens = getRoleTokens(job);
    const prioritizedSkills = prioritizeSkills(profile.skills, roleTokens);
    const prioritizedExperience = selectExperienceBullets(profile.experience, roleTokens);
    const headlineBase = profile.headline?.trim() || "Experienced technical leader";
    const tailoredHeadline = `${headlineBase} — ${job.title}`;
    const topSkills = prioritizedSkills.slice(0, 3).join(", ");
    const tailoredSummary = `${profile.summary} Focused for ${job.title} at ${job.company}${topSkills ? ` with priority on ${topSkills}` : ""}.`;
    const selectedCount = prioritizedExperience.reduce((total, item) => total + item.selectedBullets.length, 0);
    const deltaSummary = buildDeltaSummary(profile, tailoredHeadline, prioritizedSkills, selectedCount);
    const baseVariant = {
        jobId: job.id,
        generatedAt: new Date().toISOString(),
        baseSummary: profile.summary,
        tailoredHeadline,
        tailoredSummary,
        prioritizedSkills,
        experience: prioritizedExperience,
        deltaSummary,
    };
    return {
        ...baseVariant,
        markdown: toMarkdown(profile, baseVariant),
        plainText: toPlainText(profile, baseVariant),
    };
};
exports.generateTailoredResumeVariant = generateTailoredResumeVariant;
