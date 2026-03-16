import { normalizePreferences } from "./preferences";
import type { JobHunterPreferences, JobSourceConfig } from "./types";

export type CatalogSourcePack = {
  id: string;
  label: string;
  description: string;
  sources: JobSourceConfig[];
  roleKeywords: string[];
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const JOB_SOURCE_PACKS: CatalogSourcePack[] = [
  {
    id: "engineering-platform",
    label: "Engineering + Platform",
    description: "Maintained ATS source catalog focused on engineering and platform teams.",
    roleKeywords: ["engineer", "developer", "platform", "infrastructure", "backend", "frontend", "full stack", "devops"],
    sources: [
      { company: "Stripe", boardType: "greenhouse", boardToken: "stripe" },
      { company: "Cloudflare", boardType: "lever", boardToken: "cloudflare" },
      { company: "Notion", boardType: "ashby", boardToken: "notion" },
      { company: "Datadog", boardType: "greenhouse", boardToken: "datadog" },
    ],
  },
  {
    id: "product-design",
    label: "Product + Design",
    description: "Maintained ATS source catalog focused on product, UX, and design hiring.",
    roleKeywords: ["product", "pm", "designer", "ux", "ui", "research"],
    sources: [
      { company: "Figma", boardType: "greenhouse", boardToken: "figma" },
      { company: "Canva", boardType: "lever", boardToken: "canva" },
      { company: "Miro", boardType: "greenhouse", boardToken: "miro" },
    ],
  },
  {
    id: "sales-customer-success",
    label: "Sales + Customer Success",
    description: "Maintained ATS source catalog focused on GTM, partnerships, and customer roles.",
    roleKeywords: ["sales", "account", "customer", "success", "partnership", "solutions", "pre-sales"],
    sources: [
      { company: "HubSpot", boardType: "greenhouse", boardToken: "hubspot" },
      { company: "Snowflake", boardType: "lever", boardToken: "snowflake" },
      { company: "Asana", boardType: "greenhouse", boardToken: "asana" },
    ],
  },
];

const toSourceId = (source: JobSourceConfig) => `${source.boardType}:${source.boardToken.trim().toLowerCase()}`;

export const selectCatalogPacksForPreferences = (preferences: JobHunterPreferences): CatalogSourcePack[] => {
  const normalized = normalizePreferences(preferences);
  const roleSignals = [...normalized.targetRoles, ...normalized.targetKeywords]
    .join(" ")
    .toLowerCase();

  const matches = JOB_SOURCE_PACKS.filter((pack) => pack.roleKeywords.some((keyword) => roleSignals.includes(keyword)));

  return matches.length > 0 ? matches : [JOB_SOURCE_PACKS[0]];
};

export const buildDiscoverySourcesFromPreferences = (
  preferences: JobHunterPreferences,
  existingSources: JobSourceConfig[],
): { sources: JobSourceConfig[]; packIds: string[]; addedCount: number } => {
  const packs = selectCatalogPacksForPreferences(preferences);
  const sourceMap = new Map<string, JobSourceConfig>();

  existingSources.forEach((source) => {
    sourceMap.set(toSourceId(source), source);
  });

  const beforeCount = sourceMap.size;

  packs.forEach((pack) => {
    pack.sources.forEach((source) => {
      sourceMap.set(toSourceId(source), source);
    });
  });

  return {
    sources: Array.from(sourceMap.values()),
    packIds: packs.map((pack) => pack.id),
    addedCount: sourceMap.size - beforeCount,
  };
};
