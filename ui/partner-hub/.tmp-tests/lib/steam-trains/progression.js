"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValidSelectedLevelOrder = exports.getNextLevelOrder = exports.getLevelByOrder = exports.getHighestUnlockedAfterCompletion = exports.isLevelUnlocked = exports.clampLevelOrder = exports.clampUnlockedLevel = void 0;
const levels_1 = require("./levels");
const clampUnlockedLevel = (highestUnlockedLevel) => Math.min(Math.max(highestUnlockedLevel, 1), levels_1.STEAM_TRAINS_LEVELS.length);
exports.clampUnlockedLevel = clampUnlockedLevel;
const clampLevelOrder = (order) => Math.min(Math.max(order, 1), levels_1.STEAM_TRAINS_LEVELS.length);
exports.clampLevelOrder = clampLevelOrder;
const isLevelUnlocked = (levelOrder, highestUnlockedLevel) => levelOrder <= (0, exports.clampUnlockedLevel)(highestUnlockedLevel);
exports.isLevelUnlocked = isLevelUnlocked;
const getHighestUnlockedAfterCompletion = (completedLevelOrder, highestUnlockedLevel) => (0, exports.clampUnlockedLevel)(Math.max(highestUnlockedLevel, completedLevelOrder + 1));
exports.getHighestUnlockedAfterCompletion = getHighestUnlockedAfterCompletion;
const getLevelByOrder = (order) => levels_1.STEAM_TRAINS_LEVELS.find((level) => level.order === order) ?? null;
exports.getLevelByOrder = getLevelByOrder;
const getNextLevelOrder = (currentOrder) => Math.min(currentOrder + 1, levels_1.STEAM_TRAINS_LEVELS.length);
exports.getNextLevelOrder = getNextLevelOrder;
const getValidSelectedLevelOrder = (requestedOrder, mode, highestUnlockedLevel) => {
    const clampedOrder = (0, exports.clampLevelOrder)(requestedOrder);
    if (mode === "free-play") {
        return clampedOrder;
    }
    return Math.min(clampedOrder, (0, exports.clampUnlockedLevel)(highestUnlockedLevel));
};
exports.getValidSelectedLevelOrder = getValidSelectedLevelOrder;
