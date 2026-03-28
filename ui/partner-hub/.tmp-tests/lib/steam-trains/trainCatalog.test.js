"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const trainCatalog_1 = require("./trainCatalog");
const builder_1 = require("./builder");
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
    (0, node_test_1.it)("derives toddler-friendly handling stats from train geometry", () => {
        const switcher = (0, trainCatalog_1.deriveTrainHandlingProfile)((0, trainCatalog_1.getTrainDefinition)("copper-creek-switcher"));
        const passenger = (0, trainCatalog_1.deriveTrainHandlingProfile)((0, trainCatalog_1.getTrainDefinition)("sunset-passenger"));
        assert.equal(switcher.topSpeed > 0, true);
        assert.equal(passenger.slowSpeed < passenger.topSpeed, true);
        assert.equal(["light", "medium", "heavy"].includes(passenger.haulingClass), true);
    });
    (0, node_test_1.it)("keeps handling profile bounds child-friendly for every stock train", () => {
        trainCatalog_1.STEAM_TRAIN_CATALOG.forEach((train) => {
            const profile = (0, trainCatalog_1.deriveTrainHandlingProfile)(train);
            assert.equal(profile.topSpeed >= 52 && profile.topSpeed <= 82, true);
            assert.equal(profile.slowSpeed >= 20 && profile.slowSpeed < profile.topSpeed, true);
            assert.equal(profile.acceleration >= 19 && profile.acceleration <= 46, true);
            assert.equal(profile.braking >= 26 && profile.braking <= 42, true);
        });
    });
    (0, node_test_1.it)("registers custom trains in the same catalog path as stock trains", () => {
        const custom = (0, builder_1.buildTrainDefinitionFromSelection)((0, builder_1.getDefaultTrainBuilderSelection)(), "custom-train-spec");
        (0, trainCatalog_1.registerCustomTrainDefinitions)([custom]);
        const all = (0, trainCatalog_1.getAllTrainDefinitions)();
        assert.equal(all.some((train) => train.id === custom.id), true);
        assert.equal((0, trainCatalog_1.getTrainDefinition)(custom.id).id, custom.id);
        (0, trainCatalog_1.clearCustomTrainDefinitions)();
    });
    (0, node_test_1.it)("keeps custom builder variants playable after profile derivation", () => {
        const speedyCustom = (0, builder_1.buildTrainDefinitionFromSelection)({
            ...(0, builder_1.getDefaultTrainBuilderSelection)(),
            wheelArrangementId: "arrangement-passenger",
            tenderStyleId: "tender-short",
        }, "custom-train-fast");
        const heavyCustom = (0, builder_1.buildTrainDefinitionFromSelection)({
            ...(0, builder_1.getDefaultTrainBuilderSelection)(),
            wheelArrangementId: "arrangement-freight",
            drivingRodStyleId: "rod-stout",
            tenderStyleId: "tender-long",
            carSetId: "cars-freight",
        }, "custom-train-heavy");
        const fastProfile = (0, trainCatalog_1.deriveTrainHandlingProfile)(speedyCustom);
        const heavyProfile = (0, trainCatalog_1.deriveTrainHandlingProfile)(heavyCustom);
        assert.equal(fastProfile.topSpeed > heavyProfile.topSpeed, true);
        assert.equal(fastProfile.acceleration >= heavyProfile.acceleration, true);
        assert.equal(heavyProfile.braking >= 26, true);
    });
    (0, node_test_1.it)("throws for unknown train ids", () => {
        assert.throws(() => (0, trainCatalog_1.getTrainDefinition)("missing"), /Unknown train definition/);
    });
});
