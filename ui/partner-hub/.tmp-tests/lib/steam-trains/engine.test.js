"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const engine_1 = require("./engine");
const levels_1 = require("./levels");
const trainCatalog_1 = require("./trainCatalog");
const createLevelState = (levelId, mode = "levels") => (0, engine_1.createSimulation)((0, trainCatalog_1.getTrainDefinition)(trainCatalog_1.DEFAULT_STEAM_TRAIN_ID), (0, levels_1.getLevelDefinition)(levelId), mode);
(0, node_test_1.describe)("steam trains engine", () => {
    (0, node_test_1.it)("supports go / slow / stop with momentum", () => {
        let state = createLevelState("level-1-switch-start");
        state = (0, engine_1.setDriveCommand)(state, "go");
        for (let i = 0; i < 35; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        const goSpeed = state.train.speed;
        state = (0, engine_1.setDriveCommand)(state, "slow");
        for (let i = 0; i < 22; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        const slowSpeed = state.train.speed;
        state = (0, engine_1.setDriveCommand)(state, "stop");
        const firstStopStep = (0, engine_1.advanceSimulation)(state, 40);
        for (let i = 0; i < 20; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(goSpeed > slowSpeed, true);
        assert.equal(firstStopStep.train.speed > 0, true, "stop should brake, not hard freeze");
        assert.equal(state.train.speed <= 0.01, true);
    });
    (0, node_test_1.it)("reacts quickly to go and slow commands for understandable control changes", () => {
        let state = createLevelState("level-2-two-routes");
        const startSpeed = state.train.speed;
        state = (0, engine_1.advanceSimulation)((0, engine_1.setDriveCommand)(state, "go"), 120);
        const goSpeed = state.train.speed;
        for (let i = 0; i < 16; i += 1) {
            state = (0, engine_1.advanceSimulation)((0, engine_1.setDriveCommand)(state, "slow"), 40);
        }
        const slowSpeed = state.train.speed;
        const slowTarget = state.train.profile.slowSpeed * state.level.baseSpeedMultiplier;
        assert.equal(goSpeed > startSpeed, true);
        assert.equal(slowSpeed <= slowTarget + 1, true);
    });
    (0, node_test_1.it)("creates crash, rewind, and restart flow for wrong route in levels", () => {
        let state = (0, engine_1.setSwitchState)(createLevelState("level-1-switch-start"), "siding");
        for (let i = 0; i < 220 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "crashed");
        for (let i = 0; i < 50 && state.playState !== "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "running");
        assert.equal(state.train.x, state.level.startX);
    });
    (0, node_test_1.it)("keeps free play mode non-losing even on wrong switches", () => {
        let state = (0, engine_1.setSwitchState)(createLevelState("level-2-two-routes", "free-play"), "main");
        for (let i = 0; i < 420; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "running");
        assert.equal(state.mode, "free-play");
    });
    (0, node_test_1.it)("requires stopping inside the station zone on level 3", () => {
        let state = createLevelState("level-3-station-stop");
        state = (0, engine_1.setDriveCommand)(state, "go");
        for (let i = 0; i < 400 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
        }
        assert.equal(state.playState, "crashed");
    });
    (0, node_test_1.it)("allows station success when slowing and stopping in zone", () => {
        let state = createLevelState("level-3-station-stop");
        for (let i = 0; i < 260; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
            if (state.train.x > 400 && state.train.x < 470) {
                state = (0, engine_1.setDriveCommand)(state, "slow");
            }
            if (state.train.x >= 500 && state.train.x <= 560) {
                state = (0, engine_1.setDriveCommand)(state, "stop");
            }
            if (state.stationStopCompleted) {
                break;
            }
        }
        assert.equal(state.stationStopCompleted, true);
        assert.equal(state.stationStopPerfect, true);
    });
    (0, node_test_1.it)("keeps partial station-stop progress when braking is slightly fast", () => {
        let state = createLevelState("level-3-station-stop");
        state = (0, engine_1.setDriveCommand)(state, "go");
        for (let i = 0; i < 320 && state.playState === "running"; i += 1) {
            state = (0, engine_1.advanceSimulation)(state, 40);
            if (state.train.x > 410) {
                state = (0, engine_1.setDriveCommand)(state, "slow");
            }
            if (state.train.x >= 486 && state.train.x <= 620) {
                state = (0, engine_1.setDriveCommand)(state, "stop");
            }
            if (state.stationStopProgressMs > 120) {
                break;
            }
        }
        assert.equal(state.stationStopProgressMs > 0, true);
        assert.equal(state.playState, "running");
    });
    (0, node_test_1.it)("derives different handling profiles across stock trains", () => {
        const switcher = (0, trainCatalog_1.deriveTrainHandlingProfile)((0, trainCatalog_1.getTrainDefinition)("copper-creek-switcher"));
        const freight = (0, trainCatalog_1.deriveTrainHandlingProfile)((0, trainCatalog_1.getTrainDefinition)("granite-freight"));
        assert.equal(switcher.topSpeed > freight.topSpeed, true);
        assert.equal(switcher.acceleration > freight.acceleration, true);
        assert.equal(freight.braking <= switcher.braking, true);
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
                const puffed = (0, engine_1.triggerSteamPuff)(advanced);
                assert.equal(puffed.particles.length > advanced.particles.length, true, `${train.id}:${mode} puff`);
                const restarted = (0, engine_1.restartSimulation)({ ...puffed, playState: "completed" });
                assert.equal(restarted.train.definition.id, train.id, `${train.id}:${mode} restart train`);
            });
        });
    });
});
