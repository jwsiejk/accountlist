import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STEAM_TRAIN_CATALOG } from "./trainCatalog";
import { countChuffPulses, getLocomotiveSilhouette, getTrainLayout } from "./visuals";

describe("steam train visual helpers", () => {
  it("builds positive layouts for every stock train", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const layout = getTrainLayout(train, 220, 8, 0.65);
      assert.equal(layout.fullConsistLength >= train.locomotive.bodyLength, true, `${train.id}: consist length`);
      assert.equal(layout.scale > 0, true, `${train.id}: scale`);
      assert.equal(layout.tenderStart > layout.locomotiveStart, true, `${train.id}: tender start`);
      assert.equal(layout.rollingStockStart >= layout.tenderStart, true, `${train.id}: rolling stock start`);
    });
  });

  it("returns stable silhouette metrics", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const silhouette = getLocomotiveSilhouette(train.locomotive);
      assert.equal(silhouette.boilerLength > 0, true, `${train.id}: boiler length`);
      assert.equal(silhouette.smokeboxRadius > 0, true, `${train.id}: smokebox radius`);
      assert.equal(silhouette.cabRoofY < 0, true, `${train.id}: cab roof`);
    });
  });

  it("counts quarter-turn chuff pulses", () => {
    assert.equal(countChuffPulses(0, Math.PI / 4), 0);
    assert.equal(countChuffPulses(0, Math.PI / 2 + 0.01), 1);
    assert.equal(countChuffPulses(0, Math.PI * 2 + 0.01), 4);
  });
});
