import { normalizePreferences } from "./preferences";
import type { JobHunterPreferences, JobSourceConfig } from "./types";

export type CatalogSourcePackId =
  | "solutions-architecture"
  | "sales-engineering"
  | "customer-success-tam"
  | "partner-channel"
  | "infrastructure-cloud-platform"
  | "storage-data-protection";

export type CatalogSourcePack = {
  id: CatalogSourcePackId;
  label: string;
  description: string;
  roleKeywords: string[];
  sources: JobSourceConfig[];
};

export type DiscoverySourcePlan = {
  selectedPacks: CatalogSourcePack[];
  selectedPackIds: CatalogSourcePackId[];
  catalogSources: JobSourceConfig[];
  manualSources: JobSourceConfig[];
  mergedSources: JobSourceConfig[];
  addedCatalogSourceCount: number;
};

const toSourceId = (source: JobSourceConfig) => `${source.boardType}:${source.boardToken.trim().toLowerCase()}`;

const dedupeSources = (sources: JobSourceConfig[]) => {
  const sourceMap = new Map<string, JobSourceConfig>();

  sources.forEach((source) => {
    sourceMap.set(toSourceId(source), {
      company: source.company.trim(),
      boardType: source.boardType,
      boardToken: source.boardToken.trim(),
    });
  });

  return Array.from(sourceMap.values());
};

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const hasAnySignal = (haystack: string, signals: string[]) => signals.some((signal) => haystack.includes(signal));

export const JOB_SOURCE_PACKS: CatalogSourcePack[] = [
  {
    id: "solutions-architecture",
    label: "Solutions Architecture",
    description: "Customer-facing architecture roles across cloud, data, and enterprise platforms.",
    roleKeywords: [
      "solutions architect",
      "solution architect",
      "partner solutions architect",
      "customer architect",
      "enterprise architect",
      "technical architect",
    ],
    sources: [
      { company: "Snowflake", boardType: "lever", boardToken: "snowflake" },
      { company: "Confluent", boardType: "lever", boardToken: "confluent" },
      { company: "Databricks", boardType: "lever", boardToken: "databricks" },
      { company: "Nutanix", boardType: "greenhouse", boardToken: "nutanix" },
      { company: "Cloudflare", boardType: "lever", boardToken: "cloudflare" },
    ],
  },
  {
    id: "sales-engineering",
    label: "Sales Engineering",
    description: "Pre-sales engineering and field technical roles aligned to solution selling.",
    roleKeywords: [
      "sales engineer",
      "solutions engineer",
      "solution engineer",
      "pre-sales",
      "presales",
      "demo",
      "proof of concept",
      "poc",
    ],
    sources: [
      { company: "MongoDB", boardType: "greenhouse", boardToken: "mongodb" },
      { company: "GitLab", boardType: "greenhouse", boardToken: "gitlab" },
      { company: "HashiCorp", boardType: "greenhouse", boardToken: "hashicorp" },
      { company: "Elastic", boardType: "smartrecruiters", boardToken: "Elastic" },
      { company: "Clari", boardType: "ashby", boardToken: "clari" },
    ],
  },
  {
    id: "customer-success-tam",
    label: "Customer Success + TAM",
    description: "Technical account management, post-sales, adoption, and success engineering roles.",
    roleKeywords: [
      "technical account manager",
      "account manager",
      "tam",
      "customer success",
      "customer engineer",
      "post-sales",
      "post sales",
      "implementation",
      "adoption",
    ],
    sources: [
      { company: "Okta", boardType: "greenhouse", boardToken: "okta" },
      { company: "HubSpot", boardType: "greenhouse", boardToken: "hubspot" },
      { company: "Miro", boardType: "greenhouse", boardToken: "miro" },
      { company: "Braze", boardType: "greenhouse", boardToken: "braze" },
      { company: "Cockroach Labs", boardType: "greenhouse", boardToken: "cockroachlabs" },
    ],
  },
  {
    id: "partner-channel",
    label: "Partner + Channel",
    description: "Alliances, channel, partner enablement, and ecosystem-facing roles.",
    roleKeywords: [
      "partner",
      "channel",
      "alliances",
      "ecosystem",
      "gsi",
      "reseller",
      "enablement",
    ],
    sources: [
      { company: "Palo Alto Networks", boardType: "lever", boardToken: "paloaltonetworks" },
      { company: "Zscaler", boardType: "lever", boardToken: "zscaler" },
      { company: "Snyk", boardType: "greenhouse", boardToken: "snyk" },
      { company: "SentinelOne", boardType: "lever", boardToken: "sentinelone" },
    ],
  },
  {
    id: "infrastructure-cloud-platform",
    label: "Infrastructure + Cloud Platform",
    description: "Infrastructure, cloud platform, virtualization, and datacenter-oriented employers.",
    roleKeywords: [
      "infrastructure",
      "cloud",
      "platform",
      "kubernetes",
      "devops",
      "virtualization",
      "vmware",
      "datacenter",
      "migration",
      "hybrid cloud",
    ],
    sources: [
      { company: "Vultr", boardType: "greenhouse", boardToken: "vultr" },
      { company: "DigitalOcean", boardType: "greenhouse", boardToken: "digitalocean98" },
      { company: "Akamai", boardType: "smartrecruiters", boardToken: "Akamai" },
      { company: "Nerdio", boardType: "ashby", boardToken: "nerdio" },
      { company: "Fastly", boardType: "greenhouse", boardToken: "fastly" },
    ],
  },
  {
    id: "storage-data-protection",
    label: "Storage + Data Protection",
    description: "Storage, backup, recovery, and data protection vendors aligned to James's background.",
    roleKeywords: [
      "storage",
      "backup",
      "recovery",
      "data protection",
      "data resiliency",
      "disaster recovery",
      "replication",
    ],
    sources: [
      { company: "Rubrik", boardType: "greenhouse", boardToken: "rubrik" },
      { company: "Cohesity", boardType: "greenhouse", boardToken: "cohesity" },
      { company: "Pure Storage", boardType: "greenhouse", boardToken: "purestorage" },
      { company: "Veeam", boardType: "smartrecruiters", boardToken: "VeeamSoftware" },
      { company: "Wasabi Technologies", boardType: "greenhouse", boardToken: "wasabi" },
    ],
  },
];

const DEFAULT_PACK_ORDER: CatalogSourcePackId[] = [
  "solutions-architecture",
  "sales-engineering",
  "customer-success-tam",
  "partner-channel",
  "infrastructure-cloud-platform",
  "storage-data-protection",
];

export const selectCatalogPacksForPreferences = (preferences: JobHunterPreferences): CatalogSourcePack[] => {
  const normalized = normalizePreferences(preferences);
  const signals = unique([...normalized.targetRoles, ...normalized.targetKeywords].map((value) => value.trim().toLowerCase()).filter(Boolean));
  const signalText = signals.join(" ");

  const matches = JOB_SOURCE_PACKS.filter((pack) => hasAnySignal(signalText, pack.roleKeywords));

  if (matches.length > 0) {
    return matches;
  }

  const fallbackIds: CatalogSourcePackId[] = [];
  if (normalized.targetRoles.length > 0 || normalized.targetKeywords.length > 0) {
    fallbackIds.push("solutions-architecture");
  }

  if (hasAnySignal(signalText, ["cloud", "infrastructure", "storage", "vmware", "datacenter", "migration"])) {
    fallbackIds.push("infrastructure-cloud-platform");
  }

  if (fallbackIds.length === 0) {
    fallbackIds.push("solutions-architecture");
  }

  const selectedIds = unique(fallbackIds);
  return DEFAULT_PACK_ORDER.filter((id) => selectedIds.includes(id)).map((id) => JOB_SOURCE_PACKS.find((pack) => pack.id === id)!).filter(Boolean);
};

export const buildDiscoveryPlanFromPreferences = (
  preferences: JobHunterPreferences,
  manualSources: JobSourceConfig[],
): DiscoverySourcePlan => {
  const selectedPacks = selectCatalogPacksForPreferences(preferences);
  const catalogSources = dedupeSources(selectedPacks.flatMap((pack) => pack.sources));
  const normalizedManualSources = dedupeSources(manualSources);
  const mergedSources = dedupeSources([...catalogSources, ...normalizedManualSources]);

  return {
    selectedPacks,
    selectedPackIds: selectedPacks.map((pack) => pack.id),
    catalogSources,
    manualSources: normalizedManualSources,
    mergedSources,
    addedCatalogSourceCount: mergedSources.length - normalizedManualSources.length,
  };
};

export const buildDiscoverySourcesFromPreferences = (preferences: JobHunterPreferences, existingSources: JobSourceConfig[]) => {
  const plan = buildDiscoveryPlanFromPreferences(preferences, existingSources);

  return {
    sources: plan.mergedSources,
    packIds: plan.selectedPackIds,
    addedCount: plan.addedCatalogSourceCount,
  };
};

export const getSourceOriginMap = (plan: DiscoverySourcePlan) => {
  const originMap = new Map<string, "catalog" | "manual" | "catalog+manual">();

  plan.catalogSources.forEach((source) => {
    originMap.set(toSourceId(source), "catalog");
  });

  plan.manualSources.forEach((source) => {
    const sourceId = toSourceId(source);
    originMap.set(sourceId, originMap.has(sourceId) ? "catalog+manual" : "manual");
  });

  return originMap;
};

export const getCompactDiscoverySummary = (plan: DiscoverySourcePlan) => {
  const parts = [
    `${plan.selectedPackIds.length} catalog pack${plan.selectedPackIds.length === 1 ? "" : "s"}`,
    `${plan.catalogSources.length} catalog source${plan.catalogSources.length === 1 ? "" : "s"}`,
  ];

  if (plan.manualSources.length > 0) {
    parts.push(`${plan.manualSources.length} advanced manual source${plan.manualSources.length === 1 ? "" : "s"}`);
  }

  return parts.join(" · ");
};
