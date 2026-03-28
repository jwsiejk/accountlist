"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const levels_1 = require("./levels");
const progression_1 = require("./progression");
(0, node_test_1.describe)("steam trains progression", () => {
    (0, node_test_1.it)("unlocks the next level after completion", () => {
        const unlocked = (0, progression_1.getHighestUnlockedAfterCompletion)(2, 2);
        assert.equal(unlocked, 3);
    });
    (0, node_test_1.it)("never unlocks beyond available level count", () => {
        const max = levels_1.STEAM_TRAINS_LEVELS.length;
        assert.equal((0, progression_1.getHighestUnlockedAfterCompletion)(max, max), max);
        assert.equal((0, progression_1.clampUnlockedLevel)(500), max);
    });
    (0, node_test_1.it)("checks locked vs unlocked levels", () => {
        assert.equal((0, progression_1.isLevelUnlocked)(1, 1), true);
        assert.equal((0, progression_1.isLevelUnlocked)(4, 2), false);
    });
    (0, node_test_1.it)("resolves levels and next-level order", () => {
        assert.equal((0, progression_1.getLevelByOrder)(3)?.id, "level-3-station-stop");
        assert.equal((0, progression_1.getNextLevelOrder)(1), 2);
        assert.equal((0, progression_1.getNextLevelOrder)(levels_1.STEAM_TRAINS_LEVELS.length), levels_1.STEAM_TRAINS_LEVELS.length);
    });
    (0, node_test_1.it)("clamps selected level order based on mode and unlocks", () => {
        assert.equal((0, progression_1.getValidSelectedLevelOrder)(0, "levels", 3), 1);
        assert.equal((0, progression_1.getValidSelectedLevelOrder)(5, "levels", 2), 2);
        assert.equal((0, progression_1.getValidSelectedLevelOrder)(5, "free-play", 2), 5);
    });
});
