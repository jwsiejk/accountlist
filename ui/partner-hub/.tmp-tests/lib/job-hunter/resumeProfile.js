"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeProfileToMarkdown = exports.normalizeResumeProfile = exports.getDefaultResumeProfile = void 0;
const masterResume_1 = require("./resume/masterResume");
const normalizeString = (input) => (typeof input === "string" ? input.trim() : "");
const normalizeStringArray = (input) => {
    if (!Array.isArray(input)) {
        return [];
    }
    return input
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
};
const normalizeResumeExperience = (input) => {
    if (!Array.isArray(input)) {
        return [];
    }
    return input
        .filter((item) => typeof item === "object" && item !== null && !Array.isArray(item))
        .map((item) => ({
        company: typeof item.company === "string" ? item.company.trim() : "",
        title: typeof item.title === "string" ? item.title.trim() : "",
        start: typeof item.start === "string" && item.start.trim().length > 0 ? item.start.trim() : undefined,
        end: typeof item.end === "string" && item.end.trim().length > 0 ? item.end.trim() : undefined,
        bullets: normalizeStringArray(item.bullets),
    }))
        .filter((item) => item.company.length > 0 || item.title.length > 0 || item.bullets.length > 0);
};
const getDefaultResumeProfile = () => ({
    fullName: "",
    email: "",
    phone: "",
    cityState: "",
    linkedinUrl: "",
    websiteUrl: "",
    workAuthorizationNote: "",
    signatureLine: "",
    headline: "",
    summary: masterResume_1.masterResume.summary,
    skills: [...masterResume_1.masterResume.skills],
    experience: masterResume_1.masterResume.experience.map((experience) => ({
        company: experience.company,
        title: experience.role,
        bullets: [...experience.highlights],
    })),
    achievements: [...masterResume_1.masterResume.achievements],
});
exports.getDefaultResumeProfile = getDefaultResumeProfile;
const normalizeResumeProfile = (input) => {
    const defaults = (0, exports.getDefaultResumeProfile)();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return defaults;
    }
    const partial = input;
    return {
        fullName: normalizeString(partial.fullName),
        email: normalizeString(partial.email),
        phone: normalizeString(partial.phone),
        cityState: normalizeString(partial.cityState),
        linkedinUrl: normalizeString(partial.linkedinUrl),
        websiteUrl: normalizeString(partial.websiteUrl),
        workAuthorizationNote: normalizeString(partial.workAuthorizationNote),
        signatureLine: normalizeString(partial.signatureLine),
        headline: normalizeString(partial.headline),
        summary: typeof partial.summary === "string" && partial.summary.trim().length > 0 ? partial.summary.trim() : defaults.summary,
        skills: normalizeStringArray(partial.skills),
        experience: normalizeResumeExperience(partial.experience),
        achievements: normalizeStringArray(partial.achievements),
    };
};
exports.normalizeResumeProfile = normalizeResumeProfile;
const renderBullets = (bullets) => bullets.map((bullet) => `  - ${bullet}`);
const resumeProfileToMarkdown = (profile) => {
    const normalized = (0, exports.normalizeResumeProfile)(profile);
    return [
        "# Resume Profile",
        "",
        "## Identity",
        `- Name: ${normalized.fullName || "(not set)"}`,
        `- Headline: ${normalized.headline || "(not set)"}`,
        `- Email: ${normalized.email || "(not set)"}`,
        `- Phone: ${normalized.phone || "(not set)"}`,
        `- Location: ${normalized.cityState || "(not set)"}`,
        `- LinkedIn: ${normalized.linkedinUrl || "(not set)"}`,
        `- Website: ${normalized.websiteUrl || "(not set)"}`,
        `- Work Authorization: ${normalized.workAuthorizationNote || "(not set)"}`,
        `- Signature Line: ${normalized.signatureLine || "(not set)"}`,
        "",
        "## Summary",
        normalized.summary,
        "",
        "## Skills",
        ...(normalized.skills.length > 0 ? normalized.skills.map((skill) => `- ${skill}`) : ["- (none)"]),
        "",
        "## Experience",
        ...(normalized.experience.length > 0
            ? normalized.experience.flatMap((experience) => {
                const dateRange = [experience.start, experience.end].filter(Boolean).join(" - ");
                const heading = `- **${experience.title || "Role"}**, ${experience.company || "Company"}${dateRange ? ` (${dateRange})` : ""}`;
                return [heading, ...renderBullets(experience.bullets)];
            })
            : ["- (none)"]),
        "",
        "## Achievements",
        ...(normalized.achievements.length > 0 ? normalized.achievements.map((achievement) => `- ${achievement}`) : ["- (none)"]),
    ].join("\n");
};
exports.resumeProfileToMarkdown = resumeProfileToMarkdown;
