"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const preferences_1 = require("./preferences");
const sourceCatalogData_1 = require("./sourceCatalogData");
const sourceCatalog_1 = require("./sourceCatalog");
const sourceCatalogValidation_1 = require("./sourceCatalogValidation");
(0, node_test_1.describe)("job hunter source catalog discovery", () => {
    (0, node_test_1.it)("selects James-aligned packs from default preferences", () => {
        const packs = (0, sourceCatalog_1.selectCatalogPacksForPreferences)((0, preferences_1.getDefaultPreferences)());
        assert.deepEqual(packs.map((pack) => pack.id), [
            "solutions-architecture",
            "sales-engineering",
            "customer-success-tam",
            "partner-channel",
            "infrastructure-cloud-platform",
            "storage-data-protection",
        ]);
        assert.equal(sourceCatalog_1.JOB_SOURCE_PACKS.reduce((count, pack) => count + pack.sources.length, 0) >= 60, true);
    });
    (0, node_test_1.it)("selects multiple packs when preferences span role families", () => {
        const packs = (0, sourceCatalog_1.selectCatalogPacksForPreferences)({
            ...(0, preferences_1.getDefaultPreferences)(),
            targetRoles: ["Sales Engineer", "Partner Solutions Architect"],
            targetKeywords: ["customer success", "storage"],
        });
        assert.deepEqual(packs.map((pack) => pack.id), ["solutions-architecture", "sales-engineering", "customer-success-tam", "partner-channel", "storage-data-protection"]);
    });
    (0, node_test_1.it)("merges catalog-derived and manual sources without duplication", () => {
        const plan = (0, sourceCatalog_1.buildDiscoveryPlanFromPreferences)({
            ...(0, preferences_1.getDefaultPreferences)(),
            targetRoles: ["Solutions Architect"],
            targetKeywords: ["cloud"],
        }, [
            { company: "Snowflake", boardType: "lever", boardToken: "snowflake" },
            { company: "Custom Co", boardType: "lever", boardToken: "customco" },
        ]);
        assert.equal(plan.catalogSources.some((source) => source.boardToken === "snowflake"), true);
        assert.equal(plan.manualSources.length, 2);
        assert.equal(plan.mergedSources.filter((source) => source.boardToken === "snowflake").length, 1);
        assert.equal(plan.mergedSources.some((source) => source.boardToken === "customco"), true);
        assert.equal(plan.manualSources.some((source) => source.boardToken === "snowflake"), true);
        const originMap = (0, sourceCatalog_1.getSourceOriginMap)(plan);
        assert.equal(originMap.get("lever:snowflake"), "catalog+manual");
        assert.equal(originMap.get("lever:customco"), "manual");
    });
    (0, node_test_1.it)("validates and normalizes externalized catalog data", () => {
        const { errors, packs } = (0, sourceCatalogValidation_1.validateCatalogDefinition)(sourceCatalogData_1.RAW_CATALOG_SOURCE_PACKS, sourceCatalogData_1.DEFAULT_PACK_ORDER);
        assert.deepEqual(errors, []);
        assert.equal(packs.length, sourceCatalogData_1.DEFAULT_PACK_ORDER.length);
        assert.equal(packs.every((pack) => pack.sources.every((source) => source.boardToken === source.boardToken.toLowerCase())), true);
    });
    (0, node_test_1.it)("dedupes by provider/token after normalizing source fields", () => {
        const deduped = (0, sourceCatalogValidation_1.dedupeSourcesByProviderToken)([
            { company: "Snowflake", boardType: "lever", boardToken: "SnowFlake" },
            { company: "Snowflake, Inc.", boardType: "lever", boardToken: "snowflake" },
            { company: "Rubrik", boardType: "greenhouse", boardToken: "rubrik" },
        ]);
        assert.equal(deduped.length, 2);
        assert.deepEqual(deduped[0], { company: "Snowflake, Inc.", boardType: "lever", boardToken: "snowflake" });
    });
    (0, node_test_1.it)("supports discovery when no manual sources exist", () => {
        const plan = (0, sourceCatalog_1.buildDiscoveryPlanFromPreferences)((0, preferences_1.getDefaultPreferences)(), []);
        const discovery = (0, sourceCatalog_1.buildDiscoverySourcesFromPreferences)((0, preferences_1.getDefaultPreferences)(), []);
        assert.equal(plan.manualSources.length, 0);
        assert.equal(plan.catalogSources.length > 0, true);
        assert.equal(discovery.sources.length, plan.catalogSources.length);
        assert.match((0, sourceCatalog_1.getCompactDiscoverySummary)(plan), /catalog pack/);
    });
    (0, node_test_1.it)("falls back to a maintained baseline pack when preferences are sparse", () => {
        const sparsePreferences = {
            ...(0, preferences_1.getDefaultPreferences)(),
            targetRoles: [],
            targetKeywords: [],
        };
        const packs = (0, sourceCatalog_1.selectCatalogPacksForPreferences)(sparsePreferences);
        assert.deepEqual(packs.map((pack) => pack.id), ["solutions-architecture"]);
    });
});
