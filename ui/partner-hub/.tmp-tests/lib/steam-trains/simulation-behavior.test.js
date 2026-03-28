"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const engine_1 = require("./engine");
const levels_1 = require("./levels");
const trainCatalog_1 = require("./trainCatalog");
const buildState = (levelId, mode = "levels") => (0, engine_1.createSimulation)((0, trainCatalog_1.getTrainDefinition)(trainCatalog_1.DEFAULT_STEAM_TRAIN_ID), (0, levels_1.getLevelDefinition)(levelId), mode);
(0, node_test_1.describe)("steam trains simulation behavior", () => {
    (0, node_test_1.it)("records each checkpoint decision once and applies route outcomes", () => {
        let state = (0, engine_1.setSwitchState)(buildState("level-5-fast-switches"), "main");
        for (let i = 0; i < 260 && state.nextCheckpointIndex < 1; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.nextCheckpointIndex, 1);
        assert.deepEqual(state.checkpointDecisions, ["main"]);
        state = (0, engine_1.setSwitchState)(state, "main");
        for (let i = 0; i < 280 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "crashed");
        assert.deepEqual(state.checkpointDecisions, ["main", "main"]);
    });
    (0, node_test_1.it)("loops continuously in free play sandbox", () => {
        let state = buildState("level-1-switch-start", "free-play");
        const startX = state.level.startX;
        for (let i = 0; i < 900; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "running");
        assert.equal(state.train.x >= startX, true);
    });
    (0, node_test_1.it)("brakes gradually from motion while preserving readability", () => {
        let state = buildState("level-2-two-routes");
        for (let i = 0; i < 20; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        state = (0, engine_1.setDriveCommand)(state, "stop");
        const afterOneFrame = (0, engine_1.advanceSimulation)(state, 40);
        const afterTwoFrames = (0, engine_1.advanceSimulation)(afterOneFrame, 40);
        assert.equal(afterOneFrame.train.speed > afterTwoFrames.train.speed, true);
        assert.equal(afterOneFrame.train.speed > 0, true);
    });
    (0, node_test_1.it)("keeps level pacing toddler-readable with generous anticipation and fast retries", () => {
        const levelWithMostDecisions = (0, levels_1.getLevelDefinition)("level-5-fast-switches");
        const smallestAnticipation = Math.min(...levelWithMostDecisions.checkpoints.map((checkpoint) => checkpoint.anticipationDistance ?? 0));
        assert.equal(smallestAnticipation >= 240, true);
        assert.equal(levelWithMostDecisions.crashPauseMs <= 320, true);
        assert.equal(levelWithMostDecisions.rewindDurationMs <= 380, true);
    });
});
