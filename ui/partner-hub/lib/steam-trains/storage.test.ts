import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_STEAM_TRAIN_ID,
  STEAM_TRAIN_CATALOG,
} from "./trainCatalog";
import { getDefaultTrainBuilderSelection } from "./builder";
import {
  STEAM_TRAINS_CUSTOM_STORAGE_KEY,
  STEAM_TRAINS_STORAGE_KEY,
  createSavedCustomTrain,
  getDefaultSteamTrainsPreferences,
  loadSavedCustomTrains,
  loadSteamTrainsPreferences,
  saveCustomTrains,
  saveSteamTrainsPreferences,
  sanitizePreferences,
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

  it("persists highest unlocked level, helper mode, last mode, and selected train", () => {
    const storage = new MemoryStorage();
    saveSteamTrainsPreferences(storage, {
      highestUnlockedLevel: 4,
      helperMode: false,
      lastMode: "free-play",
      selectedTrainId: "granite-freight",
    });

    const loaded = loadSteamTrainsPreferences(storage);
    assert.equal(loaded.highestUnlockedLevel, 4);
    assert.equal(loaded.helperMode, false);
    assert.equal(loaded.lastMode, "free-play");
    assert.equal(loaded.selectedTrainId, "granite-freight");
    assert.notEqual(storage.getItem(STEAM_TRAINS_STORAGE_KEY), null);
  });

  it("round-trips every stock train id through sanitize/load/save", () => {
    STEAM_TRAIN_CATALOG.forEach((train) => {
      const storage = new MemoryStorage();
      const sanitized = sanitizePreferences({ selectedTrainId: train.id });

      assert.equal(sanitized.selectedTrainId, train.id, `${train.id}: sanitize`);

      saveSteamTrainsPreferences(storage, {
        ...getDefaultSteamTrainsPreferences(),
        selectedTrainId: train.id,
      });

      const loaded = loadSteamTrainsPreferences(storage);
      assert.equal(loaded.selectedTrainId, train.id, `${train.id}: load/save`);
    });
  });

  it("falls back for malformed stored values", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STEAM_TRAINS_STORAGE_KEY,
      JSON.stringify({ highestUnlockedLevel: "oops", helperMode: 1, selectedTrainId: "missing-train" }),
    );

    const loaded = loadSteamTrainsPreferences(storage);
    assert.equal(loaded.highestUnlockedLevel, 1);
    assert.equal(loaded.helperMode, true);
    assert.equal(loaded.lastMode, "levels");
    assert.equal(loaded.selectedTrainId, DEFAULT_STEAM_TRAIN_ID);
  });


  it("stores and loads multiple custom trains", () => {
    const storage = new MemoryStorage();
    const selection = getDefaultTrainBuilderSelection();
    const first = createSavedCustomTrain({ ...selection, trainName: "Comet" }, 1000);
    const second = createSavedCustomTrain({ ...selection, trainName: "River" }, 2000);

    saveCustomTrains(storage, [first, second]);

    const loaded = loadSavedCustomTrains(storage);
    assert.equal(loaded.length, 2);
    assert.equal(loaded[0]?.id, first.id);
    assert.equal(loaded[1]?.id, second.id);
    assert.equal(loaded[0]?.train.displayName.includes("Comet"), true);
    assert.notEqual(storage.getItem(STEAM_TRAINS_CUSTOM_STORAGE_KEY), null);
  });

  it("drops malformed custom train payloads", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STEAM_TRAINS_CUSTOM_STORAGE_KEY,
      JSON.stringify([{ id: "ok", selection: { wheelArrangementId: "missing" } }, { nope: true }]),
    );

    const loaded = loadSavedCustomTrains(storage);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0]?.train.id, "ok");
  });
});
