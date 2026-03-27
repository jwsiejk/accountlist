import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTrainDefinitionFromSelection,
  getDefaultTrainBuilderSelection,
  sanitizeTrainBuilderSelection,
  validateTrainBuilderSelection,
} from "./builder";
import { createSimulation, restartSimulation, triggerSteamPuff } from "./engine";
import { STEAM_TRAINS_LEVELS } from "./levels";

describe("steam train builder", () => {
  it("builds a standard TrainDefinition shape for valid selections", () => {
    const selection = getDefaultTrainBuilderSelection();
    const train = buildTrainDefinitionFromSelection(selection, "custom-train-test");

    assert.equal(train.id, "custom-train-test");
    assert.equal(train.displayName.includes(selection.trainName), true);
    assert.equal(train.locomotive.stack !== undefined, true);
    assert.equal(train.locomotive.cab !== undefined, true);
    assert.equal(train.locomotive.headlamp !== undefined, true);
    assert.equal(train.locomotive.drivingRod.wheelIndex < train.locomotive.wheelSet.count, true);
    assert.equal(train.locomotive.steamEmitter.puffRate > train.locomotive.steamEmitter.ambientRate, true);
  });

  it("prevents invalid wheel / rod / tender combinations", () => {
    const selection = {
      ...getDefaultTrainBuilderSelection(),
      wheelArrangementId: "arrangement-switcher",
      drivingRodStyleId: "rod-streamlined",
      tenderStyleId: "tender-long",
    };

    const issues = validateTrainBuilderSelection(selection);
    assert.equal(issues.includes("driving-rod-incompatible"), true);
    assert.equal(issues.includes("tender-incompatible"), true);
    assert.throws(() => buildTrainDefinitionFromSelection(selection, "custom-train-invalid"), /Invalid train builder selection/);
  });

  it("keeps geometry and steam behavior compatible with the game engine", () => {
    const selection = sanitizeTrainBuilderSelection({
      ...getDefaultTrainBuilderSelection(),
      wheelArrangementId: "arrangement-freight",
      drivingRodStyleId: "rod-stout",
      tenderStyleId: "tender-long",
      carSetId: "cars-freight",
    });

    const train = buildTrainDefinitionFromSelection(selection, "custom-train-engine");
    const level = STEAM_TRAINS_LEVELS[0];
    const state = createSimulation(train, level, "levels");

    const puffed = triggerSteamPuff(state);
    const restarted = restartSimulation(puffed);

    assert.equal(puffed.particles.length > state.particles.length, true);
    assert.equal(restarted.train.definition.id, train.id);
    assert.equal(train.locomotive.drivingRod.rodLength > 60, true);
    assert.equal(train.locomotive.wheelSet.offsetX > 0, true);
    assert.equal(train.locomotive.steamEmitter.offsetY < -40, true);
  });
});
