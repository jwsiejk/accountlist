"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const trainCatalog_1 = require("./trainCatalog");
(0, node_test_1.describe)("steam train catalog", () => {
    (0, node_test_1.it)("ships with child-friendly switcher, passenger, and freight locomotives", () => {
        assert.equal(trainCatalog_1.STEAM_TRAIN_CATALOG.length >= 3, true);
        const ids = trainCatalog_1.STEAM_TRAIN_CATALOG.map((train) => train.id);
        assert.equal(ids.includes("copper-creek-switcher"), true);
        assert.equal(ids.includes("sunset-passenger"), true);
        assert.equal(ids.includes("granite-freight"), true);
    });
    (0, node_test_1.it)("defines distinct silhouettes and extensible train structures", () => {
        const bodyLengths = new Set(trainCatalog_1.STEAM_TRAIN_CATALOG.map((train) => train.locomotive.bodyLength));
        const wheelArrangements = new Set(trainCatalog_1.STEAM_TRAIN_CATALOG.map((train) => train.locomotive.wheelArrangement));
        assert.equal(bodyLengths.size >= 3, true);
        assert.equal(wheelArrangements.size >= 3, true);
        assert.equal(trainCatalog_1.STEAM_TRAIN_CATALOG.some((train) => train.rollingStock.length > 0), true);
        assert.equal(trainCatalog_1.STEAM_TRAIN_CATALOG.some((train) => train.tender !== undefined), true);
    });
    (0, node_test_1.it)("ensures each train has safe rendering geometry and effects", () => {
        trainCatalog_1.STEAM_TRAIN_CATALOG.forEach((train) => {
            const { locomotive } = train;
            assert.equal(locomotive.bodyLength > 160, true, `${train.id}: bodyLength`);
            assert.equal(locomotive.bodyHeight > 50, true, `${train.id}: bodyHeight`);
            assert.equal(locomotive.wheelSet.count >= 2, true, `${train.id}: wheel count`);
            assert.equal(locomotive.wheelSet.radius >= 14, true, `${train.id}: wheel radius`);
            assert.equal(locomotive.drivingRod.wheelIndex < locomotive.wheelSet.count, true, `${train.id}: rod wheel index`);
            assert.equal(locomotive.drivingRod.rodLength > 60, true, `${train.id}: rod length`);
            assert.equal(locomotive.stack !== undefined, true, `${train.id}: stack`);
            assert.equal((locomotive.stack?.flareWidth ?? 0) >= (locomotive.stack?.width ?? 0), true, `${train.id}: stack flare`);
            assert.equal(locomotive.cab !== undefined, true, `${train.id}: cab`);
            assert.equal((locomotive.cab?.offsetX ?? 0) > locomotive.bodyLength * 0.45, true, `${train.id}: cab offset`);
            assert.equal(locomotive.steamEmitter.ambientRate > 0, true, `${train.id}: ambient`);
            assert.equal(locomotive.steamEmitter.puffRate > locomotive.steamEmitter.ambientRate, true, `${train.id}: puff`);
            assert.equal(locomotive.steamEmitter.maxLifetimeMs >= 900, true, `${train.id}: steam lifetime`);
            train.rollingStock.forEach((car) => {
                assert.equal(car.length >= 80, true, `${train.id}: car length`);
                assert.equal(car.height >= 40, true, `${train.id}: car height`);
            });
        });
    });
    (0, node_test_1.it)("throws for unknown train ids", () => {
        assert.throws(() => (0, trainCatalog_1.getTrainDefinition)("missing"), /Unknown train definition/);
    });
});
