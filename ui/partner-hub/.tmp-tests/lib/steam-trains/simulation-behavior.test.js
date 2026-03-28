"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const engine_1 = require("./engine");
const levels_1 = require("./levels");
const trainCatalog_1 = require("./trainCatalog");
const buildState = (levelId) => (0, engine_1.createSimulation)((0, trainCatalog_1.getTrainDefinition)(trainCatalog_1.DEFAULT_STEAM_TRAIN_ID), (0, levels_1.getLevelDefinition)(levelId), "levels");
(0, node_test_1.describe)("steam trains simulation behavior", () => {
    (0, node_test_1.it)("records each checkpoint decision only once", () => {
        let state = (0, engine_1.setSwitchState)(buildState("level-5-fast-switches"), "main");
        for (let i = 0; i < 260 && state.nextCheckpointIndex < 1; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.nextCheckpointIndex, 1);
        assert.deepEqual(state.checkpointDecisions, ["main"]);
        state = (0, engine_1.setSwitchState)(state, "siding");
        state = (0, engine_1.setSwitchState)(state, "main");
        for (let i = 0; i < 280 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "crashed");
        assert.deepEqual(state.checkpointDecisions, ["main", "main"]);
    });
    (0, node_test_1.it)("quickly transitions from crash to rewind to restart", () => {
        let state = (0, engine_1.setSwitchState)(buildState("level-1-switch-start"), "siding");
        for (let i = 0; i < 240 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "crashed");
        let rewindingSeen = false;
        for (let i = 0; i < 50 && state.playState !== "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
            rewindingSeen || (rewindingSeen = state.playState === "rewinding");
        }
        assert.equal(rewindingSeen, true);
        assert.equal(state.playState, "running");
        assert.equal(state.train.x, state.level.startX);
    });
});
