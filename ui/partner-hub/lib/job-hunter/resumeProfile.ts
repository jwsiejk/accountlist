import { masterResume } from "./resume/masterResume";
import type { ResumeExperience, ResumeProfile } from "./types";

const normalizeStringArray = (input: unknown): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const normalizeResumeExperience = (input: unknown): ResumeExperience[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is Partial<ResumeExperience> => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item) => ({
      company: typeof item.company === "string" ? item.company.trim() : "",
      title: typeof item.title === "string" ? item.title.trim() : "",
      start: typeof item.start === "string" && item.start.trim().length > 0 ? item.start.trim() : undefined,
      end: typeof item.end === "string" && item.end.trim().length > 0 ? item.end.trim() : undefined,
      bullets: normalizeStringArray(item.bullets),
    }))
    .filter((item) => item.company.length > 0 || item.title.length > 0 || item.bullets.length > 0);
};

export const getDefaultResumeProfile = (): ResumeProfile => ({
  summary: masterResume.summary,
  skills: [...masterResume.skills],
  experience: masterResume.experience.map((experience) => ({
    company: experience.company,
    title: experience.role,
    bullets: [...experience.highlights],
  })),
  achievements: [...masterResume.achievements],
});

export const normalizeResumeProfile = (input: unknown): ResumeProfile => {
  const defaults = getDefaultResumeProfile();

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return defaults;
  }

  const partial = input as Partial<ResumeProfile>;

  return {
    summary: typeof partial.summary === "string" && partial.summary.trim().length > 0 ? partial.summary.trim() : defaults.summary,
    skills: normalizeStringArray(partial.skills),
    experience: normalizeResumeExperience(partial.experience),
    achievements: normalizeStringArray(partial.achievements),
  };
};

const renderBullets = (bullets: string[]) => bullets.map((bullet) => `  - ${bullet}`);

export const resumeProfileToMarkdown = (profile: ResumeProfile): string => {
  const normalized = normalizeResumeProfile(profile);

  return [
    "# Resume Profile",
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
