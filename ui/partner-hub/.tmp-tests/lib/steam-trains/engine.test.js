"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const engine_1 = require("./engine");
const levels_1 = require("./levels");
const trainCatalog_1 = require("./trainCatalog");
const createLevelState = (levelId, mode = "levels") => (0, engine_1.createSimulation)((0, trainCatalog_1.getTrainDefinition)(trainCatalog_1.DEFAULT_STEAM_TRAIN_ID), (0, levels_1.getLevelDefinition)(levelId), mode);
(0, node_test_1.describe)("steam trains engine", () => {
    (0, node_test_1.it)("advances position and wheel rotation while running", () => {
        const start = createLevelState("level-1-switch-start");
        const next = (0, engine_1.advanceSimulation)(start, 100);
        assert.equal(next.train.x > start.train.x, true);
        assert.equal(next.train.wheelRotationRad > start.train.wheelRotationRad, true);
        assert.equal(next.playState, "running");
    });
    (0, node_test_1.it)("creates a gentle crash, rewind, and restart flow for wrong track", () => {
        let state = (0, engine_1.setSwitchState)(createLevelState("level-1-switch-start"), "siding");
        for (let i = 0; i < 220 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "crashed");
        for (let i = 0; i < 40 && state.playState === "crashed"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "rewinding");
        for (let i = 0; i < 40 && state.playState !== "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "running");
        assert.equal(state.train.x, state.level.startX);
        assert.equal(state.nextCheckpointIndex, 0);
    });
    (0, node_test_1.it)("completes a level run when switch choices are correct", () => {
        let state = createLevelState("level-1-switch-start");
        for (let i = 0; i < 360; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
            if (state.playState === "completed") {
                break;
            }
        }
        assert.equal(state.playState, "completed");
        assert.equal(state.train.speed, 0);
    });
    (0, node_test_1.it)("keeps free play mode non-losing even on wrong switches", () => {
        let state = (0, engine_1.setSwitchState)(createLevelState("level-2-two-routes", "free-play"), "main");
        for (let i = 0; i < 420; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "running");
        assert.equal(state.mode, "free-play");
    });
    (0, node_test_1.it)("supports every stock train across create/advance/puff/restart in both modes", () => {
        const level = (0, levels_1.getLevelDefinition)("level-1-switch-start");
        trainCatalog_1.STEAM_TRAIN_CATALOG.forEach((train) => {
            ["levels", "free-play"].forEach((mode) => {
                const created = (0, engine_1.createSimulation)(train, level, mode);
                assert.equal(created.train.definition.id, train.id);
                assert.equal(created.mode, mode);
                const advanced = (0, engine_1.advanceSimulation)(created, 32);
                assert.equal(advanced.train.x > created.train.x, true, `${train.id}:${mode} x movement`);
                assert.equal(advanced.train.wheelRotationRad > created.train.wheelRotationRad, true, `${train.id}:${mode} wheel rotation`);
                const puffed = (0, engine_1.triggerSteamPuff)(advanced);
                assert.equal(puffed.particles.length > advanced.particles.length, true, `${train.id}:${mode} puff`);
                const restarted = (0, engine_1.restartSimulation)({ ...puffed, playState: "completed" });
                assert.equal(restarted.train.definition.id, train.id, `${train.id}:${mode} restart train`);
                assert.equal(restarted.mode, mode, `${train.id}:${mode} restart mode`);
            });
        });
    });
    (0, node_test_1.it)("supports steam puff bursts and manual restart", () => {
        const initial = createLevelState("level-3-station-stop");
        const puffed = (0, engine_1.triggerSteamPuff)(initial);
        assert.equal(puffed.particles.length > initial.particles.length, true);
        const restarted = (0, engine_1.restartSimulation)({ ...puffed, playState: "completed" });
        assert.equal(restarted.playState, "running");
        assert.equal(restarted.train.x, restarted.level.startX);
        assert.equal(restarted.particles.length, 0);
    });
    (0, node_test_1.it)("stops briefly at the level 3 station, then resumes automatically", () => {
        let state = createLevelState("level-3-station-stop");
        for (let i = 0; i < 280 && !state.stationStopCompleted; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.stationStopCompleted, true);
        assert.equal(state.train.speed, 0);
        assert.equal(state.stationStopUntilMs !== null, true);
        const pausedX = state.train.x;
        for (let i = 0; i < 10; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.train.x, pausedX);
        for (let i = 0; i < 60 && state.train.speed === 0; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.train.speed > 0, true);
        assert.equal(state.stationStopUntilMs, null);
    });
    (0, node_test_1.it)("requires the correct post-station switch choice on level 3", () => {
        let state = (0, engine_1.setSwitchState)(createLevelState("level-3-station-stop"), "siding");
        let stopped = false;
        for (let i = 0; i < 420 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
            stopped || (stopped = state.stationStopCompleted);
        }
        assert.equal(stopped, true);
        assert.equal(state.playState, "crashed");
        assert.deepEqual(state.checkpointDecisions, ["siding"]);
    });
    (0, node_test_1.it)("handles multiple switches in level 5", () => {
        let state = createLevelState("level-5-fast-switches");
        state = (0, engine_1.setSwitchState)(state, "main");
        for (let i = 0; i < 260 && state.nextCheckpointIndex < 1; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.nextCheckpointIndex, 1);
        state = (0, engine_1.setSwitchState)(state, "siding");
        for (let i = 0; i < 260 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "completed");
        assert.deepEqual(state.checkpointDecisions, ["main", "siding"]);
    });
    (0, node_test_1.it)("ignores switch changes when run is not running", () => {
        const crashedState = {
            ...createLevelState("level-1-switch-start"),
            playState: "crashed",
            switchState: "main",
        };
        const rewindingState = { ...crashedState, playState: "rewinding" };
        const completedState = { ...crashedState, playState: "completed" };
        assert.equal((0, engine_1.setSwitchState)(crashedState, "siding").switchState, "main");
        assert.equal((0, engine_1.setSwitchState)(rewindingState, "siding").switchState, "main");
        assert.equal((0, engine_1.setSwitchState)(completedState, "siding").switchState, "main");
    });
});
