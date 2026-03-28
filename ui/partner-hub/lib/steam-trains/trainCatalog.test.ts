import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clearCustomTrainDefinitions, deriveTrainHandlingProfile, getAllTrainDefinitions, getTrainDefinition, registerCustomTrainDefinitions, STEAM_TRAIN_CATALOG } from "./trainCatalog";
import { buildTrainDefinitionFromSelection, getDefaultTrainBuilderSelection } from "./builder";

describe("steam train catalog", () => {
  it("ships with child-friendly switcher, passenger, and freight locomotives", () => {
    assert.equal(STEAM_TRAIN_CATALOG.length >= 3, true);

    const ids = STEAM_TRAIN_CATALOG.map((train) => train.id);
    assert.equal(ids.includes("copper-creek-switcher"), true);
    assert.equal(ids.includes("sunset-passenger"), true);
    assert.equal(ids.includes("granite-freight"), true);
  });

  it("defines distinct silhouettes and extensible train structures", () => {
    const bodyLengths = new Set(STEAM_TRAIN_CATALOG.map((train) => train.locomotive.bodyLength));
    const wheelArrangements = new Set(STEAM_TRAIN_CATALOG.map((train) => train.locomotive.wheelArrangement));

    assert.equal(bodyLengths.size >= 3, true);
    assert.equal(wheelArrangements.size >= 3, true);
    assert.equal(STEAM_TRAIN_CATALOG.some((train) => train.rollingStock.length > 0), true);
    assert.equal(STEAM_TRAIN_CATALOG.some((train) => train.tender !== undefined), true);
  });

  it("ensures each train has safe rendering geometry and effects", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const { locomotive } = train;

      assert.equal(locomotive.bodyLength > 160, true, `${train.id}: bodyLength`);
      assert.equal(locomotive.bodyHeight > 50, true, `${train.id}: bodyHeight`);
      assert.equal(locomotive.wheelSet.count >= 2, true, `${train.id}: wheel count`);
      assert.equal(locomotive.wheelSet.radius >= 14, true, `${train.id}: wheel radius`);
      assert.equal(locomotive.drivingRod.wheelIndex < locomotive.wheelSet.count, true, `${train.id}: rod wheel index`);
      assert.equal(locomotive.drivingRod.rodLength > 60, true, `${train.id}: rod length`);

      assert.equal(locomotive.stack !== undefined, true, `${train.id}: stack`);
      assert.equal((locomotive.stack?.flareWidth ?? 0) >= (locomotive.stack?.width ?? 0), true, `${train.id}: stack flare`);

      assert.equal(locomotive.cab !== undefined, true, `${train.id}: cab`);
      assert.equal((locomotive.cab?.offsetX ?? 0) > locomotive.bodyLength * 0.45, true, `${train.id}: cab offset`);

      assert.equal(locomotive.steamEmitter.ambientRate > 0, true, `${train.id}: ambient`);
      assert.equal(locomotive.steamEmitter.puffRate > locomotive.steamEmitter.ambientRate, true, `${train.id}: puff`);
      assert.equal(locomotive.steamEmitter.maxLifetimeMs >= 900, true, `${train.id}: steam lifetime`);

      train.rollingStock.forEach((car) => {
        assert.equal(car.length >= 80, true, `${train.id}: car length`);
        assert.equal(car.height >= 40, true, `${train.id}: car height`);
      });
    });
  });

  it("derives toddler-friendly handling stats from train geometry", () => {
    const switcher = deriveTrainHandlingProfile(getTrainDefinition("copper-creek-switcher"));
    const passenger = deriveTrainHandlingProfile(getTrainDefinition("sunset-passenger"));

    assert.equal(switcher.topSpeed > 0, true);
    assert.equal(passenger.slowSpeed < passenger.topSpeed, true);
    assert.equal(["light", "medium", "heavy"].includes(passenger.haulingClass), true);
  });

  it("registers custom trains in the same catalog path as stock trains", () => {
    const custom = buildTrainDefinitionFromSelection(getDefaultTrainBuilderSelection(), "custom-train-spec");
    registerCustomTrainDefinitions([custom]);

    const all = getAllTrainDefinitions();
    assert.equal(all.some((train) => train.id === custom.id), true);
    assert.equal(getTrainDefinition(custom.id).id, custom.id);

    clearCustomTrainDefinitions();
  });

  it("throws for unknown train ids", () => {
    assert.throws(() => getTrainDefinition("missing"), /Unknown train definition/);
  });
});
