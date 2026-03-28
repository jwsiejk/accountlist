"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const trainCatalog_1 = require("./trainCatalog");
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
    (0, node_test_1.it)("persists highest unlocked level, helper mode, last mode, and selected train", () => {
        const storage = new MemoryStorage();
        (0, storage_1.saveSteamTrainsPreferences)(storage, {
            highestUnlockedLevel: 4,
            helperMode: false,
            lastMode: "free-play",
            selectedTrainId: "granite-freight",
        });
        const loaded = (0, storage_1.loadSteamTrainsPreferences)(storage);
        assert.equal(loaded.highestUnlockedLevel, 4);
        assert.equal(loaded.helperMode, false);
        assert.equal(loaded.lastMode, "free-play");
        assert.equal(loaded.selectedTrainId, "granite-freight");
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
        storage.setItem(storage_1.STEAM_TRAINS_STORAGE_KEY, JSON.stringify({ highestUnlockedLevel: "oops", helperMode: 1, selectedTrainId: "missing-train" }));
        const loaded = (0, storage_1.loadSteamTrainsPreferences)(storage);
        assert.equal(loaded.highestUnlockedLevel, 1);
        assert.equal(loaded.helperMode, true);
        assert.equal(loaded.lastMode, "levels");
        assert.equal(loaded.selectedTrainId, trainCatalog_1.DEFAULT_STEAM_TRAIN_ID);
    });
});
