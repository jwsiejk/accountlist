import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createSimulation, setDriveCommand } from "./engine";
import { getLevelDefinition } from "./levels";
import { buildCabTheme, buildScene3dModel } from "./scene3d";
import { getTrainDefinition } from "./trainCatalog";

describe("steam trains scene3d model", () => {
  it("builds cab theme using selected train colors and consist weight", () => {
    const lightTheme = buildCabTheme(getTrainDefinition("copper-creek-switcher"));
    const heavyTheme = buildCabTheme(getTrainDefinition("sunset-passenger"));

    assert.equal(lightTheme.trimColor, "#d97706");
    assert.equal(lightTheme.handlingLabel, "Light");
    assert.equal(heavyTheme.handlingLabel, "Heavy");
  });

  it("exposes forward cues for switches and station zone", () => {
    const train = getTrainDefinition("copper-creek-switcher");
    let state = createSimulation(train, getLevelDefinition("level-3-station-stop"), "levels");

    state = setDriveCommand(state, "go");
    for (let step = 0; step < 80; step += 1) {
      state = { ...state, train: { ...state.train, x: state.train.x + 6 } };
    }

    const model = buildScene3dModel(state);
    assert.equal(model.checkpointCues.length > 0, true);
    assert.equal(Boolean(model.stationCue), true);
    assert.equal(model.stationCue ? model.stationCue.endZ > model.stationCue.startZ : false, true);
  });
});
