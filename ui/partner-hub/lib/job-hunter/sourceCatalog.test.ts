import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDefaultPreferences } from "./preferences";
import { DEFAULT_PACK_ORDER, RAW_CATALOG_SOURCE_PACKS } from "./sourceCatalogData";
import {
  buildDiscoveryPlanFromPreferences,
  buildDiscoverySourcesFromPreferences,
  getCompactDiscoverySummary,
  getSourceOriginMap,
  selectCatalogPacksForPreferences,
  JOB_SOURCE_PACKS,
} from "./sourceCatalog";
import { dedupeSourcesByProviderToken, validateCatalogDefinition } from "./sourceCatalogValidation";

describe("job hunter source catalog discovery", () => {
  it("selects James-aligned packs from default preferences", () => {
    const packs = selectCatalogPacksForPreferences(getDefaultPreferences());

    assert.deepEqual(
      packs.map((pack) => pack.id),
      [
        "solutions-architecture",
        "sales-engineering",
        "customer-success-tam",
        "partner-channel",
        "infrastructure-cloud-platform",
        "storage-data-protection",
      ],
    );
    assert.equal(JOB_SOURCE_PACKS.reduce((count, pack) => count + pack.sources.length, 0) >= 60, true);
  });

  it("selects multiple packs when preferences span role families", () => {
    const packs = selectCatalogPacksForPreferences({
      ...getDefaultPreferences(),
      targetRoles: ["Sales Engineer", "Partner Solutions Architect"],
      targetKeywords: ["customer success", "storage"],
    });

    assert.deepEqual(
      packs.map((pack) => pack.id),
      ["solutions-architecture", "sales-engineering", "customer-success-tam", "partner-channel", "storage-data-protection"],
    );
  });

  it("merges catalog-derived and manual sources without duplication", () => {
    const plan = buildDiscoveryPlanFromPreferences(
      {
        ...getDefaultPreferences(),
        targetRoles: ["Solutions Architect"],
        targetKeywords: ["cloud"],
      },
      [
        { company: "Snowflake", boardType: "lever", boardToken: "snowflake" },
        { company: "Custom Co", boardType: "lever", boardToken: "customco" },
      ],
    );

    assert.equal(plan.catalogSources.some((source) => source.boardToken === "snowflake"), true);
    assert.equal(plan.manualSources.length, 2);
    assert.equal(plan.mergedSources.filter((source) => source.boardToken === "snowflake").length, 1);
    assert.equal(plan.mergedSources.some((source) => source.boardToken === "customco"), true);
    assert.equal(plan.manualSources.some((source) => source.boardToken === "snowflake"), true);

    const originMap = getSourceOriginMap(plan);
    assert.equal(originMap.get("lever:snowflake"), "catalog+manual");
    assert.equal(originMap.get("lever:customco"), "manual");
  });


  it("validates and normalizes externalized catalog data", () => {
    const { errors, packs } = validateCatalogDefinition(RAW_CATALOG_SOURCE_PACKS, DEFAULT_PACK_ORDER);

    assert.deepEqual(errors, []);
    assert.equal(packs.length, DEFAULT_PACK_ORDER.length);
    assert.equal(packs.every((pack) => pack.sources.every((source) => source.boardToken === source.boardToken.toLowerCase())), true);
  });

  it("dedupes by provider/token after normalizing source fields", () => {
    const deduped = dedupeSourcesByProviderToken([
      { company: "Snowflake", boardType: "lever", boardToken: "SnowFlake" },
      { company: "Snowflake, Inc.", boardType: "lever", boardToken: "snowflake" },
      { company: "Rubrik", boardType: "greenhouse", boardToken: "rubrik" },
    ]);

    assert.equal(deduped.length, 2);
    assert.deepEqual(deduped[0], { company: "Snowflake, Inc.", boardType: "lever", boardToken: "snowflake" });
  });

  it("supports discovery when no manual sources exist", () => {
    const plan = buildDiscoveryPlanFromPreferences(getDefaultPreferences(), []);
    const discovery = buildDiscoverySourcesFromPreferences(getDefaultPreferences(), []);

    assert.equal(plan.manualSources.length, 0);
    assert.equal(plan.catalogSources.length > 0, true);
    assert.equal(discovery.sources.length, plan.catalogSources.length);
    assert.match(getCompactDiscoverySummary(plan), /catalog pack/);
  });

  it("falls back to a maintained baseline pack when preferences are sparse", () => {
    const sparsePreferences = {
      ...getDefaultPreferences(),
      targetRoles: [],
      targetKeywords: [],
    };

    const packs = selectCatalogPacksForPreferences(sparsePreferences);
    assert.deepEqual(packs.map((pack) => pack.id), ["solutions-architecture"]);
  });
});
