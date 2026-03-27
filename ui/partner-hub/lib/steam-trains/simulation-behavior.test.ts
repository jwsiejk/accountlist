import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { advanceSimulation, createSimulation, setSwitchState } from "./engine";
import { getLevelDefinition } from "./levels";
import { getTrainDefinition } from "./trainCatalog";

const buildState = () => createSimulation(getTrainDefinition("big-boy-junior"), getLevelDefinition("yard-switch-intro"));

describe("steam trains simulation behavior", () => {
  it("locks turnout choice once the train reaches the switch", () => {
    let state = setSwitchState(buildState(), "main");

    for (let i = 0; i < 260 && state.turnoutDecision === null; i += 1) {
      state = advanceSimulation(state, 40);
    }

    assert.equal(state.turnoutDecision, "main");

    state = setSwitchState(state, "siding");

    for (let i = 0; i < 180; i += 1) {
      state = advanceSimulation(state, 40);
      if (state.train.x > state.level.switchX + 200 || state.playState === "completed") {
        break;
      }
    }

    assert.equal(state.turnoutDecision, "main");
    assert.notEqual(state.playState, "crashed");
  });

  it("auto-resets after crashResetDelayMs while still allowing visible crash state", () => {
    let state = setSwitchState(buildState(), "siding");

    for (let i = 0; i < 240; i += 1) {
      state = advanceSimulation(state, 40);
      if (state.playState === "crashed") {
        break;
      }
    }

    assert.equal(state.playState, "crashed");
    assert.notEqual(state.crashAtMs, null);

    let beforeDelay = state;
    for (let elapsed = 0; elapsed < state.level.crashResetDelayMs - 50; elapsed += 40) {
      beforeDelay = advanceSimulation(beforeDelay, 40);
    }
    assert.equal(beforeDelay.playState, "crashed");

    let afterDelay = state;
    for (let elapsed = 0; elapsed < state.level.crashResetDelayMs + 80; elapsed += 40) {
      afterDelay = advanceSimulation(afterDelay, 40);
      if (afterDelay.playState === "running") {
        break;
      }
    }

    assert.equal(afterDelay.playState, "running");
    assert.equal(afterDelay.train.x, afterDelay.level.startX);
    assert.equal(afterDelay.turnoutDecision, null);
  });
});
