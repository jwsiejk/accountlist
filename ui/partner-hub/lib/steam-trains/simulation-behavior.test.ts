import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { advanceSimulation, createSimulation, setDriveCommand, setSwitchState } from "./engine";
import { getLevelDefinition } from "./levels";
import { DEFAULT_STEAM_TRAIN_ID, getTrainDefinition } from "./trainCatalog";

const buildState = (levelId: string, mode: "levels" | "free-play" = "levels") =>
  createSimulation(getTrainDefinition(DEFAULT_STEAM_TRAIN_ID), getLevelDefinition(levelId), mode);

describe("steam trains simulation behavior", () => {
  it("records each checkpoint decision once and applies route outcomes", () => {
    let state = setSwitchState(buildState("level-5-fast-switches"), "main");

    for (let i = 0; i < 260 && state.nextCheckpointIndex < 1; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.nextCheckpointIndex, 1);
    assert.deepEqual(state.checkpointDecisions, ["main"]);

    state = setSwitchState(state, "main");

    for (let i = 0; i < 280 && state.playState === "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "crashed");
    assert.deepEqual(state.checkpointDecisions, ["main", "main"]);
  });

  it("loops continuously in free play sandbox", () => {
    let state = buildState("level-1-switch-start", "free-play");
    const startX = state.level.startX;

    for (let i = 0; i < 900; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "running");
    assert.equal(state.train.x >= startX, true);
  });

  it("brakes gradually from motion while preserving readability", () => {
    let state = buildState("level-2-two-routes");

    for (let i = 0; i < 20; i += 1) {
      state = advanceSimulation(state, 40);
    }

    state = setDriveCommand(state, "stop");
    const afterOneFrame = advanceSimulation(state, 40);
    const afterTwoFrames = advanceSimulation(afterOneFrame, 40);

    assert.equal(afterOneFrame.train.speed > afterTwoFrames.train.speed, true);
    assert.equal(afterOneFrame.train.speed > 0, true);
  });
});
