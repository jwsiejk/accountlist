"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompactDiscoverySummary = exports.getSourceOriginMap = exports.buildDiscoverySourcesFromPreferences = exports.buildDiscoveryPlanFromPreferences = exports.selectCatalogPacksForPreferences = exports.JOB_SOURCE_PACKS = void 0;
const preferences_1 = require("./preferences");
const sourceCatalogData_1 = require("./sourceCatalogData");
const sourceCatalogValidation_1 = require("./sourceCatalogValidation");
const dedupeSources = (sources) => (0, sourceCatalogValidation_1.dedupeSourcesByProviderToken)(sources);
const unique = (values) => Array.from(new Set(values));
const hasAnySignal = (haystack, signals) => signals.some((signal) => haystack.includes(signal));
exports.JOB_SOURCE_PACKS = (0, sourceCatalogValidation_1.buildValidatedCatalogPacks)(sourceCatalogData_1.RAW_CATALOG_SOURCE_PACKS, sourceCatalogData_1.DEFAULT_PACK_ORDER);
const PACK_BY_ID = new Map(exports.JOB_SOURCE_PACKS.map((pack) => [pack.id, pack]));
const selectCatalogPacksForPreferences = (preferences) => {
    const normalized = (0, preferences_1.normalizePreferences)(preferences);
    const signals = unique([...normalized.targetRoles, ...normalized.targetKeywords]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean));
    const signalText = signals.join(" ");
    const matches = exports.JOB_SOURCE_PACKS.filter((pack) => hasAnySignal(signalText, pack.roleKeywords));
    if (matches.length > 0) {
        return matches;
    }
    const fallbackIds = [];
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
    return sourceCatalogData_1.DEFAULT_PACK_ORDER.map((id) => PACK_BY_ID.get(id)).filter((pack) => Boolean(pack && selectedIds.includes(pack.id)));
};
exports.selectCatalogPacksForPreferences = selectCatalogPacksForPreferences;
const buildDiscoveryPlanFromPreferences = (preferences, manualSources) => {
    const selectedPacks = (0, exports.selectCatalogPacksForPreferences)(preferences);
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
exports.buildDiscoveryPlanFromPreferences = buildDiscoveryPlanFromPreferences;
const buildDiscoverySourcesFromPreferences = (preferences, existingSources) => {
    const plan = (0, exports.buildDiscoveryPlanFromPreferences)(preferences, existingSources);
    return {
        sources: plan.mergedSources,
        packIds: plan.selectedPackIds,
        addedCount: plan.addedCatalogSourceCount,
    };
};
exports.buildDiscoverySourcesFromPreferences = buildDiscoverySourcesFromPreferences;
const getSourceOriginMap = (plan) => {
    const originMap = new Map();
    plan.catalogSources.forEach((source) => {
        originMap.set((0, sourceCatalogValidation_1.toProviderTokenKey)(source), "catalog");
    });
    plan.manualSources.forEach((source) => {
        const sourceId = (0, sourceCatalogValidation_1.toProviderTokenKey)(source);
        originMap.set(sourceId, originMap.has(sourceId) ? "catalog+manual" : "manual");
    });
    return originMap;
};
exports.getSourceOriginMap = getSourceOriginMap;
const getCompactDiscoverySummary = (plan) => {
    const parts = [
        `${plan.selectedPackIds.length} catalog pack${plan.selectedPackIds.length === 1 ? "" : "s"}`,
        `${plan.catalogSources.length} catalog source${plan.catalogSources.length === 1 ? "" : "s"}`,
    ];
    if (plan.manualSources.length > 0) {
        parts.push(`${plan.manualSources.length} advanced manual source${plan.manualSources.length === 1 ? "" : "s"}`);
    }
    return parts.join(" · ");
};
exports.getCompactDiscoverySummary = getCompactDiscoverySummary;
