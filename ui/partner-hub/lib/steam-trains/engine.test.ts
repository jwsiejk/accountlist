import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceSimulation,
  createSimulation,
  restartSimulation,
  setDriveCommand,
  setSwitchState,
  triggerSteamPuff,
} from "./engine";
import { getLevelDefinition } from "./levels";
import { DEFAULT_STEAM_TRAIN_ID, STEAM_TRAIN_CATALOG, deriveTrainHandlingProfile, getTrainDefinition } from "./trainCatalog";

const createLevelState = (levelId: string, mode: "levels" | "free-play" = "levels") =>
  createSimulation(getTrainDefinition(DEFAULT_STEAM_TRAIN_ID), getLevelDefinition(levelId), mode);

describe("steam trains engine", () => {
  it("supports go / slow / stop with momentum", () => {
    let state = createLevelState("level-1-switch-start");

    state = setDriveCommand(state, "go");
    for (let i = 0; i < 35; i += 1) {
      state = advanceSimulation(state, 40);
    }
    const goSpeed = state.train.speed;

    state = setDriveCommand(state, "slow");
    for (let i = 0; i < 22; i += 1) {
      state = advanceSimulation(state, 40);
    }
    const slowSpeed = state.train.speed;

    state = setDriveCommand(state, "stop");
    const firstStopStep = advanceSimulation(state, 40);
    for (let i = 0; i < 20; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(goSpeed > slowSpeed, true);
    assert.equal(firstStopStep.train.speed > 0, true, "stop should brake, not hard freeze");
    assert.equal(state.train.speed <= 0.01, true);
  });

  it("reacts quickly to go and slow commands for understandable control changes", () => {
    let state = createLevelState("level-2-two-routes");
    const startSpeed = state.train.speed;
    state = advanceSimulation(setDriveCommand(state, "go"), 120);
    const goSpeed = state.train.speed;
    for (let i = 0; i < 16; i += 1) {
      state = advanceSimulation(setDriveCommand(state, "slow"), 40);
    }
    const slowSpeed = state.train.speed;
    const slowTarget = state.train.profile.slowSpeed * state.level.baseSpeedMultiplier;

    assert.equal(goSpeed > startSpeed, true);
    assert.equal(slowSpeed <= slowTarget + 1, true);
  });

  it("creates crash, rewind, and restart flow for wrong route in levels", () => {
    let state = setSwitchState(createLevelState("level-1-switch-start"), "siding");

    for (let i = 0; i < 220 && state.playState === "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "crashed");

    for (let i = 0; i < 50 && state.playState !== "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "running");
    assert.equal(state.train.x, state.level.startX);
  });

  it("keeps free play mode non-losing even on wrong switches", () => {
    let state = setSwitchState(createLevelState("level-2-two-routes", "free-play"), "main");
    for (let i = 0; i < 420; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "running");
    assert.equal(state.mode, "free-play");
  });

  it("requires stopping inside the station zone on level 3", () => {
    let state = createLevelState("level-3-station-stop");
    state = setDriveCommand(state, "go");

    for (let i = 0; i < 400 && state.playState === "running"; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.playState, "crashed");
  });

  it("allows station success when slowing and stopping in zone", () => {
    let state = createLevelState("level-3-station-stop");

    for (let i = 0; i < 260; i += 1) {
      state = advanceSimulation(state, 40);
      if (state.train.x > 400 && state.train.x < 470) {
        state = setDriveCommand(state, "slow");
      }
      if (state.train.x >= 500 && state.train.x <= 560) {
        state = setDriveCommand(state, "stop");
      }
      if (state.stationStopCompleted) {
        break;
      }
    }

    assert.equal(state.stationStopCompleted, true);
    assert.equal(state.stationStopPerfect, true);
  });

  it("keeps partial station-stop progress when braking is slightly fast", () => {
    let state = createLevelState("level-3-station-stop");
    state = setDriveCommand(state, "go");

    for (let i = 0; i < 320 && state.playState === "running"; i += 1) {
      state = advanceSimulation(state, 40);
      if (state.train.x > 410) {
        state = setDriveCommand(state, "slow");
      }
      if (state.train.x >= 486 && state.train.x <= 620) {
        state = setDriveCommand(state, "stop");
      }
      if (state.stationStopProgressMs > 120) {
        break;
      }
    }

    assert.equal(state.stationStopProgressMs > 0, true);
    assert.equal(state.playState, "running");
  });

  it("derives different handling profiles across stock trains", () => {
    const switcher = deriveTrainHandlingProfile(getTrainDefinition("copper-creek-switcher"));
    const freight = deriveTrainHandlingProfile(getTrainDefinition("granite-freight"));
    assert.equal(switcher.topSpeed > freight.topSpeed, true);
    assert.equal(switcher.acceleration > freight.acceleration, true);
    assert.equal(freight.braking <= switcher.braking, true);
  });

  it("supports every stock train across create/advance/puff/restart in both modes", () => {
    const level = getLevelDefinition("level-1-switch-start");

    STEAM_TRAIN_CATALOG.forEach((train) => {
      (["levels", "free-play"] as const).forEach((mode) => {
        const created = createSimulation(train, level, mode);

        assert.equal(created.train.definition.id, train.id);
        assert.equal(created.mode, mode);

        const advanced = advanceSimulation(created, 32);
        assert.equal(advanced.train.x > created.train.x, true, `${train.id}:${mode} x movement`);

        const puffed = triggerSteamPuff(advanced);
        assert.equal(puffed.particles.length > advanced.particles.length, true, `${train.id}:${mode} puff`);

        const restarted = restartSimulation({ ...puffed, playState: "completed" });
        assert.equal(restarted.train.definition.id, train.id, `${train.id}:${mode} restart train`);
      });
    });
  });
});
