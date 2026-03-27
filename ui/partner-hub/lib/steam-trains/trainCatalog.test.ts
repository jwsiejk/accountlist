import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTrainDefinition, STEAM_TRAIN_CATALOG } from "./trainCatalog";

describe("steam train catalog", () => {
  it("ships with at least one steam locomotive definition", () => {
    assert.equal(STEAM_TRAIN_CATALOG.length >= 1, true);
    const train = getTrainDefinition("big-boy-junior");
    assert.equal(train.locomotive.wheelSet.count >= 3, true);
    assert.equal(train.locomotive.drivingRod.rodLength > 0, true);
  });

  it("throws for unknown train ids", () => {
    assert.throws(() => getTrainDefinition("missing"), /Unknown train definition/);
  });
});
