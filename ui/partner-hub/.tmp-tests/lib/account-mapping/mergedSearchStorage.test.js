"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mergedSearchStorage_1 = require("./mergedSearchStorage");
class MemoryStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.get(key) ?? null;
    }
    setItem(key, value) {
        this.store.set(key, value);
    }
    removeItem(key) {
        this.store.delete(key);
    }
}
(0, node_test_1.describe)("merged search storage", () => {
    (0, node_test_1.it)("saves and loads saved searches", () => {
        const storage = new MemoryStorage();
        const presets = [
            {
                id: "preset-1",
                name: "Overlap only",
                createdAt: "2024-03-01T12:00:00.000Z",
                filters: {
                    search: "Acme",
                    vendorOwner: "Jane",
                    partnerOwner: "",
                    matchType: "name",
                    overlapOnly: true,
                    statusRule: "any",
                },
            },
        ];
        (0, mergedSearchStorage_1.saveSavedSearches)(storage, presets);
        const loaded = (0, mergedSearchStorage_1.loadSavedSearches)(storage);
        assert.deepEqual(loaded, presets);
        assert.ok(storage.getItem(mergedSearchStorage_1.SAVED_SEARCHES_STORAGE_KEY));
    });
    (0, node_test_1.it)("saves and loads column selections per dataset", () => {
        const storage = new MemoryStorage();
        (0, mergedSearchStorage_1.saveColumnSelection)(storage, "run", ["vendor_account_name", "match_type"]);
        (0, mergedSearchStorage_1.saveColumnSelection)(storage, "upload", ["partner_owner"]);
        assert.deepEqual((0, mergedSearchStorage_1.getColumnSelection)(storage, "run"), [
            "vendor_account_name",
            "match_type",
        ]);
        assert.deepEqual((0, mergedSearchStorage_1.getColumnSelection)(storage, "upload"), ["partner_owner"]);
        assert.ok(storage.getItem(mergedSearchStorage_1.COLUMN_SELECTION_STORAGE_KEY));
    });
});
