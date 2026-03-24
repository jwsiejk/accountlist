import { normalizePreferences } from "./preferences";
import { DEFAULT_PACK_ORDER, RAW_CATALOG_SOURCE_PACKS } from "./sourceCatalogData";
import type { CatalogSourcePack, CatalogSourcePackId } from "./sourceCatalogTypes";
import { buildValidatedCatalogPacks, dedupeSourcesByProviderToken, toProviderTokenKey } from "./sourceCatalogValidation";
import type { JobHunterPreferences, JobSourceConfig } from "./types";

export type DiscoverySourcePlan = {
  selectedPacks: CatalogSourcePack[];
  selectedPackIds: CatalogSourcePackId[];
  catalogSources: JobSourceConfig[];
  manualSources: JobSourceConfig[];
  mergedSources: JobSourceConfig[];
  addedCatalogSourceCount: number;
};

const dedupeSources = (sources: JobSourceConfig[]) => dedupeSourcesByProviderToken(sources);

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const hasAnySignal = (haystack: string, signals: string[]) => signals.some((signal) => haystack.includes(signal));

export const JOB_SOURCE_PACKS: CatalogSourcePack[] = buildValidatedCatalogPacks(RAW_CATALOG_SOURCE_PACKS, DEFAULT_PACK_ORDER);

const PACK_BY_ID = new Map(JOB_SOURCE_PACKS.map((pack) => [pack.id, pack]));

export const selectCatalogPacksForPreferences = (preferences: JobHunterPreferences): CatalogSourcePack[] => {
  const normalized = normalizePreferences(preferences);
  const signals = unique(
    [...normalized.targetRoles, ...normalized.targetKeywords]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
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
  return DEFAULT_PACK_ORDER.map((id) => PACK_BY_ID.get(id)).filter((pack): pack is CatalogSourcePack => Boolean(pack && selectedIds.includes(pack.id)));
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
    originMap.set(toProviderTokenKey(source), "catalog");
  });

  plan.manualSources.forEach((source) => {
    const sourceId = toProviderTokenKey(source);
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
