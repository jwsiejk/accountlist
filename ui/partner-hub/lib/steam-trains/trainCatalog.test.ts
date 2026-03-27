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

  it("supports optional locomotive detail structures for future train variants", () => {
    const train = getTrainDefinition("big-boy-junior");
    const { locomotive } = train;

    assert.equal(locomotive.stack !== undefined, true);
    assert.equal((locomotive.stack?.flareWidth ?? 0) >= (locomotive.stack?.width ?? 0), true);

    assert.equal(locomotive.cab !== undefined, true);
    assert.equal((locomotive.cab?.windowWidth ?? 0) > 0, true);

    assert.equal(locomotive.headlamp !== undefined, true);
    assert.equal((locomotive.headlamp?.radius ?? 0) > 0, true);

    assert.equal(locomotive.pilot !== undefined, true);
    assert.equal((locomotive.pilot?.ribCount ?? 0) >= 3, true);

    assert.equal((locomotive.pilotWheels?.count ?? 0) > 0, true);
    assert.equal((locomotive.trailingWheels?.count ?? 0) > 0, true);
  });

  it("throws for unknown train ids", () => {
    assert.throws(() => getTrainDefinition("missing"), /Unknown train definition/);
  });
});
