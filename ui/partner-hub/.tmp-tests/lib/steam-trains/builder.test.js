"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const builder_1 = require("./builder");
const engine_1 = require("./engine");
const levels_1 = require("./levels");
(0, node_test_1.describe)("steam train builder", () => {
    (0, node_test_1.it)("builds a standard TrainDefinition shape for valid selections", () => {
        const selection = (0, builder_1.getDefaultTrainBuilderSelection)();
        const train = (0, builder_1.buildTrainDefinitionFromSelection)(selection, "custom-train-test");
        assert.equal(train.id, "custom-train-test");
        assert.equal(train.displayName.includes(selection.trainName), true);
        assert.equal(train.locomotive.stack !== undefined, true);
        assert.equal(train.locomotive.cab !== undefined, true);
        assert.equal(train.locomotive.headlamp !== undefined, true);
        assert.equal(train.locomotive.drivingRod.wheelIndex < train.locomotive.wheelSet.count, true);
        assert.equal(train.locomotive.steamEmitter.puffRate > train.locomotive.steamEmitter.ambientRate, true);
    });
    (0, node_test_1.it)("prevents invalid wheel / rod / tender combinations", () => {
        const selection = {
            ...(0, builder_1.getDefaultTrainBuilderSelection)(),
            wheelArrangementId: "arrangement-switcher",
            drivingRodStyleId: "rod-streamlined",
            tenderStyleId: "tender-long",
        };
        const issues = (0, builder_1.validateTrainBuilderSelection)(selection);
        assert.equal(issues.includes("driving-rod-incompatible"), true);
        assert.equal(issues.includes("tender-incompatible"), true);
        assert.throws(() => (0, builder_1.buildTrainDefinitionFromSelection)(selection, "custom-train-invalid"), /Invalid train builder selection/);
    });
    (0, node_test_1.it)("keeps geometry and steam behavior compatible with the game engine", () => {
        const selection = (0, builder_1.sanitizeTrainBuilderSelection)({
            ...(0, builder_1.getDefaultTrainBuilderSelection)(),
            wheelArrangementId: "arrangement-freight",
            drivingRodStyleId: "rod-stout",
            tenderStyleId: "tender-long",
            carSetId: "cars-freight",
        });
        const train = (0, builder_1.buildTrainDefinitionFromSelection)(selection, "custom-train-engine");
        const level = levels_1.STEAM_TRAINS_LEVELS[0];
        const state = (0, engine_1.createSimulation)(train, level, "levels");
        const puffed = (0, engine_1.triggerSteamPuff)(state);
        const restarted = (0, engine_1.restartSimulation)(puffed);
        assert.equal(puffed.particles.length > state.particles.length, true);
        assert.equal(restarted.train.definition.id, train.id);
        assert.equal(train.locomotive.drivingRod.rodLength > 60, true);
        assert.equal(train.locomotive.wheelSet.offsetX > 0, true);
        assert.equal(train.locomotive.steamEmitter.offsetY < -40, true);
    });
});
