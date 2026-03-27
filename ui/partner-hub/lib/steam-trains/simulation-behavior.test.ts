import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { advanceSimulation, createSimulation, setSwitchState } from "./engine";
import { getLevelDefinition } from "./levels";
import { getTrainDefinition } from "./trainCatalog";

const buildState = (levelId: string) =>
  createSimulation(getTrainDefinition("big-boy-junior"), getLevelDefinition(levelId), "levels");

describe("steam trains simulation behavior", () => {
  it("records each checkpoint decision only once", () => {
    let state = setSwitchState(buildState("level-5-fast-switches"), "main");

    for (let i = 0; i < 260 && state.nextCheckpointIndex < 1; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.nextCheckpointIndex, 1);
    assert.deepEqual(state.checkpointDecisions, ["main"]);

    state = setSwitchState(state, "siding");
    state = setSwitchState(state, "main");

    for (let i = 0; i < 280 && state.playState === "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "crashed");
    assert.deepEqual(state.checkpointDecisions, ["main", "main"]);
  });

  it("quickly transitions from crash to rewind to restart", () => {
    let state = setSwitchState(buildState("level-1-switch-start"), "siding");

    for (let i = 0; i < 240 && state.playState === "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "crashed");

    let rewindingSeen = false;
    for (let i = 0; i < 50 && state.playState !== "running"; i += 1) {
      state = advanceSimulation(state, 40);
      rewindingSeen ||= state.playState === "rewinding";
    }

    assert.equal(rewindingSeen, true);
    assert.equal(state.playState, "running");
    assert.equal(state.train.x, state.level.startX);
  });
});
