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
  mergeLevelProgress,
  scoreLevelRun,
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

  it("scores stars for completion / no crash / station stop", () => {
    const perfect = scoreLevelRun({ completed: true, crashed: false, stationStopPerfect: true }, true);
    const crashRun = scoreLevelRun({ completed: true, crashed: true, stationStopPerfect: true }, true);
    const noStation = scoreLevelRun({ completed: true, crashed: false, stationStopPerfect: false }, false);

    assert.equal(perfect.stars, 3);
    assert.equal(crashRun.stars, 2);
    assert.equal(noStation.stars, 3);
  });

  it("merges progress only when new star score is better", () => {
    const initial = mergeLevelProgress({}, "level-1-switch-start", scoreLevelRun({ completed: true, crashed: true, stationStopPerfect: false }, false));
    const unchanged = mergeLevelProgress(initial, "level-1-switch-start", scoreLevelRun({ completed: true, crashed: true, stationStopPerfect: false }, false));
    const improved = mergeLevelProgress(unchanged, "level-1-switch-start", scoreLevelRun({ completed: true, crashed: false, stationStopPerfect: true }, false));

    assert.equal(initial["level-1-switch-start"]?.stars, 2);
    assert.equal(unchanged["level-1-switch-start"]?.stars, 2);
    assert.equal(improved["level-1-switch-start"]?.stars, 3);
  });

  it("clamps selected level order based on mode and unlocks", () => {
    assert.equal(getValidSelectedLevelOrder(0, "levels", 3), 1);
    assert.equal(getValidSelectedLevelOrder(5, "levels", 2), 2);
    assert.equal(getValidSelectedLevelOrder(5, "free-play", 2), 5);
  });
});
