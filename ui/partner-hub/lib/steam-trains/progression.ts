import { STEAM_TRAINS_LEVELS } from "./levels";
import type { GameMode, LevelProgressRecord, LevelRunSummary } from "./types";

export const clampUnlockedLevel = (highestUnlockedLevel: number) =>
  Math.min(Math.max(highestUnlockedLevel, 1), STEAM_TRAINS_LEVELS.length);

export const clampLevelOrder = (order: number) => Math.min(Math.max(order, 1), STEAM_TRAINS_LEVELS.length);

export const isLevelUnlocked = (levelOrder: number, highestUnlockedLevel: number) =>
  levelOrder <= clampUnlockedLevel(highestUnlockedLevel);

export const getHighestUnlockedAfterCompletion = (
  completedLevelOrder: number,
  highestUnlockedLevel: number,
): number => clampUnlockedLevel(Math.max(highestUnlockedLevel, completedLevelOrder + 1));

export const getLevelByOrder = (order: number) => STEAM_TRAINS_LEVELS.find((level) => level.order === order) ?? null;

export const getNextLevelOrder = (currentOrder: number) =>
  Math.min(currentOrder + 1, STEAM_TRAINS_LEVELS.length);

export const getValidSelectedLevelOrder = (
  requestedOrder: number,
  mode: GameMode,
  highestUnlockedLevel: number,
) => {
  const clampedOrder = clampLevelOrder(requestedOrder);
  if (mode === "free-play") {
    return clampedOrder;
  }

  return Math.min(clampedOrder, clampUnlockedLevel(highestUnlockedLevel));
};

export const scoreLevelRun = (summary: LevelRunSummary, requiresStationStop: boolean): LevelProgressRecord => {
  if (!summary.completed) {
    return {
      stars: 0,
      bestRun: summary,
    };
  }

  const completionStar = 1;
  const noCrashStar = summary.crashed ? 0 : 1;
  const stationStar = requiresStationStop ? (summary.stationStopPerfect ? 1 : 0) : 1;

  return {
    stars: completionStar + noCrashStar + stationStar,
    bestRun: summary,
  };
};

export const mergeLevelProgress = (
  previous: Record<string, LevelProgressRecord>,
  levelId: string,
  incoming: LevelProgressRecord,
) => {
  const existing = previous[levelId];
  if (!existing || incoming.stars >= existing.stars) {
    return {
      ...previous,
      [levelId]: incoming,
    };
  }
  return previous;
};
