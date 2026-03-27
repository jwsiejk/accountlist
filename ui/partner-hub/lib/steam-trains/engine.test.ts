import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceSimulation,
  createSimulation,
  restartSimulation,
  setSwitchState,
  triggerSteamPuff,
} from "./engine";
import { getLevelDefinition } from "./levels";
import { getTrainDefinition } from "./trainCatalog";

const createLevelState = (levelId: string, mode: "levels" | "free-play" = "levels") =>
  createSimulation(getTrainDefinition("big-boy-junior"), getLevelDefinition(levelId), mode);

describe("steam trains engine", () => {
  it("advances position and wheel rotation while running", () => {
    const start = createLevelState("level-1-switch-start");
    const next = advanceSimulation(start, 100);

    assert.equal(next.train.x > start.train.x, true);
    assert.equal(next.train.wheelRotationRad > start.train.wheelRotationRad, true);
    assert.equal(next.playState, "running");
  });

  it("creates a gentle crash, rewind, and restart flow for wrong track", () => {
    let state = setSwitchState(createLevelState("level-1-switch-start"), "siding");

    for (let i = 0; i < 220 && state.playState === "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "crashed");

    for (let i = 0; i < 40 && state.playState === "crashed"; i += 1) {
      state = advanceSimulation(state, 40);
    }
    assert.equal(state.playState, "rewinding");

    for (let i = 0; i < 40 && state.playState !== "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "running");
    assert.equal(state.train.x, state.level.startX);
    assert.equal(state.nextCheckpointIndex, 0);
  });

  it("completes a level run when switch choices are correct", () => {
    let state = createLevelState("level-1-switch-start");
    for (let i = 0; i < 360; i += 1) {
      state = advanceSimulation(state, 40);
      if (state.playState === "completed") {
        break;
      }
    }

    assert.equal(state.playState, "completed");
    assert.equal(state.train.speed, 0);
  });

  it("keeps free play mode non-losing even on wrong switches", () => {
    let state = setSwitchState(createLevelState("level-2-two-routes", "free-play"), "main");
    for (let i = 0; i < 420; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "running");
    assert.equal(state.mode, "free-play");
  });

  it("supports steam puff bursts and manual restart", () => {
    const initial = createLevelState("level-3-station-stop");
    const puffed = triggerSteamPuff(initial);

    assert.equal(puffed.particles.length > initial.particles.length, true);

    const restarted = restartSimulation({ ...puffed, playState: "completed" });
    assert.equal(restarted.playState, "running");
    assert.equal(restarted.train.x, restarted.level.startX);
    assert.equal(restarted.particles.length, 0);
  });

  it("handles multiple switches in level 5", () => {
    let state = createLevelState("level-5-fast-switches");
    state = setSwitchState(state, "main");

    for (let i = 0; i < 260 && state.nextCheckpointIndex < 1; i += 1) {
      state = advanceSimulation(state, 40);
    }
    assert.equal(state.nextCheckpointIndex, 1);

    state = setSwitchState(state, "siding");
    for (let i = 0; i < 260 && state.playState === "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "completed");
    assert.deepEqual(state.checkpointDecisions, ["main", "siding"]);
  });
});
