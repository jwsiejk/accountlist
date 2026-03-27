import { STEAM_TRAINS_LEVELS } from "./levels";

export const clampUnlockedLevel = (highestUnlockedLevel: number) =>
  Math.min(Math.max(highestUnlockedLevel, 1), STEAM_TRAINS_LEVELS.length);

export const isLevelUnlocked = (levelOrder: number, highestUnlockedLevel: number) =>
  levelOrder <= clampUnlockedLevel(highestUnlockedLevel);

export const getHighestUnlockedAfterCompletion = (
  completedLevelOrder: number,
  highestUnlockedLevel: number,
): number => clampUnlockedLevel(Math.max(highestUnlockedLevel, completedLevelOrder + 1));

export const getLevelByOrder = (order: number) => STEAM_TRAINS_LEVELS.find((level) => level.order === order) ?? null;

export const getNextLevelOrder = (currentOrder: number) =>
  Math.min(currentOrder + 1, STEAM_TRAINS_LEVELS.length);
