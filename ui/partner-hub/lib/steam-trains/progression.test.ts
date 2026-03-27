import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STEAM_TRAINS_LEVELS } from "./levels";
import {
  clampUnlockedLevel,
  getValidSelectedLevelOrder,
  getHighestUnlockedAfterCompletion,
  getLevelByOrder,
  getNextLevelOrder,
  isLevelUnlocked,
} from "./progression";

describe("steam trains progression", () => {
  it("unlocks the next level after completion", () => {
    const unlocked = getHighestUnlockedAfterCompletion(2, 2);
    assert.equal(unlocked, 3);
  });

  it("never unlocks beyond available level count", () => {
    const max = STEAM_TRAINS_LEVELS.length;
    assert.equal(getHighestUnlockedAfterCompletion(max, max), max);
    assert.equal(clampUnlockedLevel(500), max);
  });

  it("checks locked vs unlocked levels", () => {
    assert.equal(isLevelUnlocked(1, 1), true);
    assert.equal(isLevelUnlocked(4, 2), false);
  });

  it("resolves levels and next-level order", () => {
    assert.equal(getLevelByOrder(3)?.id, "level-3-station-stop");
    assert.equal(getNextLevelOrder(1), 2);
    assert.equal(getNextLevelOrder(STEAM_TRAINS_LEVELS.length), STEAM_TRAINS_LEVELS.length);
  });

  it("clamps selected level order based on mode and unlocks", () => {
    assert.equal(getValidSelectedLevelOrder(0, "levels", 3), 1);
    assert.equal(getValidSelectedLevelOrder(5, "levels", 2), 2);
    assert.equal(getValidSelectedLevelOrder(5, "free-play", 2), 5);
  });
});
