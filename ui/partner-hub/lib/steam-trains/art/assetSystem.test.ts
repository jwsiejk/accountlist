import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STEAM_TRAIN_CATALOG } from "../trainCatalog";
import { DEFAULT_TRAIN_ART_PALETTE, getMaterialPalette } from "./assetSystem";

describe("steam train asset system", () => {
  it("provides stable default palette entries", () => {
    assert.equal(typeof DEFAULT_TRAIN_ART_PALETTE.railBedTop, "string");
    assert.equal(typeof DEFAULT_TRAIN_ART_PALETTE.railSide, "string");
    assert.equal(typeof DEFAULT_TRAIN_ART_PALETTE.sceneBrick, "string");
  });

  it("maps stock locomotives to material palettes", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const materials = getMaterialPalette(train.locomotive);
      assert.equal(materials.paintedMetalTop, train.locomotive.color, `${train.id}: top color`);
      assert.equal(materials.brass, train.locomotive.trimColor, `${train.id}: trim color`);
      assert.equal(materials.steel.length > 0, true, `${train.id}: steel color`);
    });
  });
});
