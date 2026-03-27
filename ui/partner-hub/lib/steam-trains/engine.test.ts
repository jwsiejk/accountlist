import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advanceSimulation,
  createSimulation,
  restartAfterCrash,
  setSwitchState,
  triggerSteamPuff,
} from "./engine";
import { getLevelDefinition } from "./levels";
import { getTrainDefinition } from "./trainCatalog";

const buildState = () => createSimulation(getTrainDefinition("big-boy-junior"), getLevelDefinition("yard-switch-intro"));

describe("steam trains engine", () => {
  it("advances position and wheel rotation while running", () => {
    const start = buildState();
    const next = advanceSimulation(start, 100);

    assert.equal(next.train.x > start.train.x, true);
    assert.equal(next.train.wheelRotationRad > start.train.wheelRotationRad, true);
    assert.equal(next.playState, "running");
  });

  it("switches into a gentle crash state on wrong track", () => {
    let state = setSwitchState(buildState(), "siding");
    for (let i = 0; i < 220; i += 1) {
      state = advanceSimulation(state, 40);
      if (state.playState === "crashed") {
        break;
      }
    }

    assert.equal(state.playState, "crashed");
    assert.equal(state.train.speed, 0);
    assert.equal(state.crashAtMs !== null, true);
  });

  it("completes when switch is set to safe branch", () => {
    let state = buildState();
    for (let i = 0; i < 400; i += 1) {
      state = advanceSimulation(state, 40);
      if (state.playState === "completed") {
        break;
      }
    }

    assert.equal(state.playState, "completed");
    assert.equal(state.train.speed, 0);
  });

  it("supports steam puff bursts and fast restart", () => {
    const initial = buildState();
    const puffed = triggerSteamPuff(initial);

    assert.equal(puffed.particles.length > initial.particles.length, true);

    const crashed = {
      ...puffed,
      playState: "crashed" as const,
      crashAtMs: puffed.elapsedMs,
    };
    const restarted = restartAfterCrash(crashed);

    assert.equal(restarted.playState, "running");
    assert.equal(restarted.train.x, restarted.level.startX);
    assert.equal(restarted.particles.length, 0);
  });
});
