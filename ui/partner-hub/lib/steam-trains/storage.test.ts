import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STEAM_TRAINS_STORAGE_KEY,
  getDefaultSteamTrainsPreferences,
  loadSteamTrainsPreferences,
  saveSteamTrainsPreferences,
} from "./storage";

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

describe("steam trains storage", () => {
  it("returns defaults when no preferences exist", () => {
    const storage = new MemoryStorage();
    assert.deepEqual(loadSteamTrainsPreferences(storage), getDefaultSteamTrainsPreferences());
  });

  it("persists highest unlocked level, helper mode, and last mode", () => {
    const storage = new MemoryStorage();
    saveSteamTrainsPreferences(storage, {
      highestUnlockedLevel: 4,
      helperMode: false,
      lastMode: "free-play",
    });

    const loaded = loadSteamTrainsPreferences(storage);
    assert.equal(loaded.highestUnlockedLevel, 4);
    assert.equal(loaded.helperMode, false);
    assert.equal(loaded.lastMode, "free-play");
    assert.notEqual(storage.getItem(STEAM_TRAINS_STORAGE_KEY), null);
  });

  it("falls back for malformed stored values", () => {
    const storage = new MemoryStorage();
    storage.setItem(STEAM_TRAINS_STORAGE_KEY, JSON.stringify({ highestUnlockedLevel: "oops", helperMode: 1 }));

    const loaded = loadSteamTrainsPreferences(storage);
    assert.equal(loaded.highestUnlockedLevel, 1);
    assert.equal(loaded.helperMode, true);
    assert.equal(loaded.lastMode, "levels");
  });
});
