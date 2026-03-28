"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const engine_1 = require("./engine");
const levels_1 = require("./levels");
const scene3d_1 = require("./scene3d");
const trainCatalog_1 = require("./trainCatalog");
const getZSpread = (values) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max, span: max - min };
};
(0, node_test_1.describe)("steam trains scene3d model", () => {
    (0, node_test_1.it)("builds cab theme using selected train colors and consist weight", () => {
        const lightTheme = (0, scene3d_1.buildCabTheme)((0, trainCatalog_1.getTrainDefinition)("copper-creek-switcher"));
        const heavyTheme = (0, scene3d_1.buildCabTheme)((0, trainCatalog_1.getTrainDefinition)("sunset-passenger"));
        assert.equal(lightTheme.trimColor, "#d97706");
        assert.equal(lightTheme.handlingLabel, "Light");
        assert.equal(lightTheme.dashColor.startsWith("#"), true);
        assert.equal(heavyTheme.handlingLabel, "Heavy");
    });
    (0, node_test_1.it)("exposes forward cues for switches, route geometry, and station zone", () => {
        const train = (0, trainCatalog_1.getTrainDefinition)("copper-creek-switcher");
        let state = (0, engine_1.createSimulation)(train, (0, levels_1.getLevelDefinition)("level-3-station-stop"), "levels");
        state = (0, engine_1.setDriveCommand)(state, "go");
        for (let step = 0; step < 80; step += 1) {
            state = { ...state, train: { ...state.train, x: state.train.x + 6 } };
        }
        const model = (0, scene3d_1.buildScene3dModel)(state);
        assert.equal(model.checkpointCues.length > 0, true);
        assert.equal(model.routePreviews.length > 0, true);
        assert.equal(Boolean(model.stationCue), true);
        assert.equal(model.stationCue ? model.stationCue.endZ > model.stationCue.startZ : false, true);
        assert.equal(model.landmarks.some((landmark) => landmark.type === "station"), true);
    });
    (0, node_test_1.it)("models route branches and landmark cue geometry for real 3d placement", () => {
        const train = (0, trainCatalog_1.getTrainDefinition)("copper-creek-switcher");
        const level = (0, levels_1.getLevelDefinition)("level-4-bridge-tunnel");
        const initial = (0, engine_1.createSimulation)(train, level, "levels");
        const state = {
            ...initial,
            train: {
                ...initial.train,
                x: level.startX + 180,
            },
        };
        const model = (0, scene3d_1.buildScene3dModel)(state);
        assert.equal(model.routePreviews.length > 0, true);
        const firstRoute = model.routePreviews[0];
        assert.equal(Boolean(firstRoute), true);
        if (!firstRoute) {
            return;
        }
        assert.equal(firstRoute.endZ > firstRoute.splitZ, true);
        assert.equal(Math.abs(firstRoute.branchOffset) > 0, true);
        const hasBridgeOrTunnel = model.landmarks.some((landmark) => landmark.type === "bridge" || landmark.type === "tunnel");
        assert.equal(hasBridgeOrTunnel, true);
    });
    (0, node_test_1.it)("distributes repeater families across depth and moves stable ids with progress", () => {
        const train = (0, trainCatalog_1.getTrainDefinition)("copper-creek-switcher");
        const level = (0, levels_1.getLevelDefinition)("level-2-two-routes");
        const stateA = (0, engine_1.createSimulation)(train, level, "levels");
        const stateB = {
            ...stateA,
            train: {
                ...stateA.train,
                x: stateA.train.x + 40,
            },
        };
        const modelA = (0, scene3d_1.buildScene3dModel)(stateA);
        const modelB = (0, scene3d_1.buildScene3dModel)(stateB);
        const families = ["sleeper", "pole", "tree"];
        families.forEach((kind) => {
            const zValues = modelA.repeaters.filter((item) => item.kind === kind).map((item) => item.z);
            const distinct = new Set(zValues.map((value) => value.toFixed(2)));
            const spread = getZSpread(zValues);
            assert.equal(distinct.size > 4, true);
            assert.equal(spread.min <= -80, true);
            assert.equal(spread.max >= 260, true);
        });
        const stableIds = ["sleeper-0", "pole-0", "tree-0"];
        stableIds.forEach((id) => {
            const repeaterA = modelA.repeaters.find((item) => item.id === id);
            const repeaterB = modelB.repeaters.find((item) => item.id === id);
            assert.equal(Boolean(repeaterA), true);
            assert.equal(Boolean(repeaterB), true);
            assert.notEqual(repeaterA?.z, repeaterB?.z);
        });
    });
    (0, node_test_1.it)("spreads clouds, ridges, and buildings across near/far forward depth", () => {
        const train = (0, trainCatalog_1.getTrainDefinition)("sunset-passenger");
        const level = (0, levels_1.getLevelDefinition)("level-5-fast-switches");
        const initial = (0, engine_1.createSimulation)(train, level, "levels");
        const state = { ...initial, train: { ...initial.train, x: level.startX + 200 } };
        const model = (0, scene3d_1.buildScene3dModel)(state);
        assert.equal(model.clouds.length > 0, true);
        assert.equal(model.ridges.length > 0, true);
        assert.equal(model.buildings.length > 0, true);
        assert.equal(model.routeCues.length > 0, true);
        assert.equal(model.routeCues[0]?.hintText.includes("track"), true);
        const cloudSpread = getZSpread(model.clouds.map((cloud) => cloud.z));
        const ridgeSpread = getZSpread(model.ridges.map((ridge) => ridge.z));
        const buildingSpread = getZSpread(model.buildings.map((building) => building.z));
        assert.equal(cloudSpread.span >= 250, true);
        assert.equal(ridgeSpread.span >= 250, true);
        assert.equal(buildingSpread.span >= 250, true);
        const cloudDepths = new Set(model.clouds.map((cloud) => cloud.depth));
        const ridgeDepths = new Set(model.ridges.map((ridge) => ridge.depth));
        assert.deepEqual(cloudDepths, new Set(["near", "far"]));
        assert.deepEqual(ridgeDepths, new Set(["near", "far"]));
        assert.equal(model.clouds.some((cloud) => cloud.z <= -50), true);
        assert.equal(model.clouds.some((cloud) => cloud.z >= 220), true);
        assert.equal(model.ridges.some((ridge) => ridge.z <= -50), true);
        assert.equal(model.ridges.some((ridge) => ridge.z >= 220), true);
        assert.equal(model.buildings.some((building) => building.z <= -50), true);
        assert.equal(model.buildings.some((building) => building.z >= 220), true);
    });
});
