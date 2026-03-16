import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDefaultPreferences } from "./preferences";
import { buildDiscoverySourcesFromPreferences, selectCatalogPacksForPreferences } from "./sourceCatalog";

describe("job hunter source catalog discovery", () => {
  it("selects role-matched packs when preferences include matching targets", () => {
    const packs = selectCatalogPacksForPreferences({
      ...getDefaultPreferences(),
      targetRoles: ["Senior Product Manager"],
      targetKeywords: ["UX"],
    });

    assert.equal(packs.some((pack) => pack.id === "product-design"), true);
  });

  it("falls back to engineering pack when no role signals match", () => {
    const packs = selectCatalogPacksForPreferences({
      ...getDefaultPreferences(),
      targetRoles: ["Astronaut"],
      targetKeywords: ["orbital"],
    });

    assert.equal(packs.length, 1);
    assert.equal(packs[0].id, "engineering-platform");
  });

  it("builds discovery sources by merging catalog with existing manual sources", () => {
    const existing = [{ company: "Custom Co", boardType: "lever", boardToken: "customco" }] as const;

    const discovery = buildDiscoverySourcesFromPreferences(
      {
        ...getDefaultPreferences(),
        targetRoles: ["Sales Engineer"],
        targetKeywords: ["customer"],
      },
      [...existing],
    );

    assert.equal(discovery.packIds.includes("sales-customer-success"), true);
    assert.equal(discovery.sources.some((source) => source.boardToken === "customco"), true);
    assert.equal(discovery.addedCount > 0, true);
  });
});
