"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const trainCatalog_1 = require("./trainCatalog");
const builder_1 = require("./builder");
const storage_1 = require("./storage");
class MemoryStorage {
    constructor() {
        this.map = new Map();
    }
    getItem(key) {
        return this.map.get(key) ?? null;
    }
    setItem(key, value) {
        this.map.set(key, value);
    }
}
(0, node_test_1.describe)("steam trains storage", () => {
    (0, node_test_1.it)("returns defaults when no preferences exist", () => {
        const storage = new MemoryStorage();
        assert.deepEqual((0, storage_1.loadSteamTrainsPreferences)(storage), (0, storage_1.getDefaultSteamTrainsPreferences)());
    });
    (0, node_test_1.it)("persists level progress stars along with mode and train", () => {
        const storage = new MemoryStorage();
        (0, storage_1.saveSteamTrainsPreferences)(storage, {
            highestUnlockedLevel: 4,
            helperMode: false,
            lastMode: "free-play",
            selectedTrainId: "granite-freight",
            levelProgress: {
                "level-1-switch-start": {
                    stars: 3,
                    bestRun: { completed: true, crashed: false, stationStopPerfect: true },
                },
            },
        });
        const loaded = (0, storage_1.loadSteamTrainsPreferences)(storage);
        assert.equal(loaded.highestUnlockedLevel, 4);
        assert.equal(loaded.lastMode, "free-play");
        assert.equal(loaded.levelProgress["level-1-switch-start"]?.stars, 3);
        assert.notEqual(storage.getItem(storage_1.STEAM_TRAINS_STORAGE_KEY), null);
    });
    (0, node_test_1.it)("round-trips every stock train id through sanitize/load/save", () => {
        trainCatalog_1.STEAM_TRAIN_CATALOG.forEach((train) => {
            const storage = new MemoryStorage();
            const sanitized = (0, storage_1.sanitizePreferences)({ selectedTrainId: train.id });
            assert.equal(sanitized.selectedTrainId, train.id, `${train.id}: sanitize`);
            (0, storage_1.saveSteamTrainsPreferences)(storage, {
                ...(0, storage_1.getDefaultSteamTrainsPreferences)(),
                selectedTrainId: train.id,
            });
            const loaded = (0, storage_1.loadSteamTrainsPreferences)(storage);
            assert.equal(loaded.selectedTrainId, train.id, `${train.id}: load/save`);
        });
    });
    (0, node_test_1.it)("falls back for malformed stored values", () => {
        const storage = new MemoryStorage();
        storage.setItem(storage_1.STEAM_TRAINS_STORAGE_KEY, JSON.stringify({ highestUnlockedLevel: "oops", helperMode: 1, selectedTrainId: "missing-train", levelProgress: 7 }));
        const loaded = (0, storage_1.loadSteamTrainsPreferences)(storage);
        assert.equal(loaded.highestUnlockedLevel, 1);
        assert.equal(loaded.helperMode, true);
        assert.equal(loaded.lastMode, "levels");
        assert.equal(loaded.selectedTrainId, trainCatalog_1.DEFAULT_STEAM_TRAIN_ID);
        assert.deepEqual(loaded.levelProgress, {});
    });
    (0, node_test_1.it)("stores and loads multiple custom trains", () => {
        const storage = new MemoryStorage();
        const selection = (0, builder_1.getDefaultTrainBuilderSelection)();
        const first = (0, storage_1.createSavedCustomTrain)({ ...selection, trainName: "Comet" }, 1000);
        const second = (0, storage_1.createSavedCustomTrain)({ ...selection, trainName: "River" }, 2000);
        (0, storage_1.saveCustomTrains)(storage, [first, second]);
        const loaded = (0, storage_1.loadSavedCustomTrains)(storage);
        assert.equal(loaded.length, 2);
        assert.equal(loaded[0]?.id, first.id);
        assert.equal(loaded[1]?.id, second.id);
        assert.equal(loaded[0]?.train.displayName.includes("Comet"), true);
        assert.notEqual(storage.getItem(storage_1.STEAM_TRAINS_CUSTOM_STORAGE_KEY), null);
    });
    (0, node_test_1.it)("drops malformed custom train payloads", () => {
        const storage = new MemoryStorage();
        storage.setItem(storage_1.STEAM_TRAINS_CUSTOM_STORAGE_KEY, JSON.stringify([{ id: "ok", selection: { wheelArrangementId: "missing" } }, { nope: true }]));
        const loaded = (0, storage_1.loadSavedCustomTrains)(storage);
        assert.equal(loaded.length, 1);
        assert.equal(loaded[0]?.train.id, "ok");
    });
});
