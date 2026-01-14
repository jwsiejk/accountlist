import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import {
  COLUMN_SELECTION_STORAGE_KEY,
  SAVED_SEARCHES_STORAGE_KEY,
  getColumnSelection,
  loadSavedSearches,
  saveColumnSelection,
  saveSavedSearches,
} from "./mergedSearchStorage";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe("merged search storage", () => {
  it("saves and loads saved searches", () => {
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

    saveSavedSearches(storage, presets);
    const loaded = loadSavedSearches(storage);

    assert.deepEqual(loaded, presets);
    assert.ok(storage.getItem(SAVED_SEARCHES_STORAGE_KEY));
  });

  it("saves and loads column selections per dataset", () => {
    const storage = new MemoryStorage();

    saveColumnSelection(storage, "run", ["vendor_account_name", "match_type"]);
    saveColumnSelection(storage, "upload", ["partner_owner"]);

    assert.deepEqual(getColumnSelection(storage, "run"), [
      "vendor_account_name",
      "match_type",
    ]);
    assert.deepEqual(getColumnSelection(storage, "upload"), ["partner_owner"]);
    assert.ok(storage.getItem(COLUMN_SELECTION_STORAGE_KEY));
  });
});
