import { DEFAULT_STEAM_TRAIN_ID, hasTrainDefinition } from "./trainCatalog";
import type { GameMode } from "./types";

export type SteamTrainsPreferences = {
  highestUnlockedLevel: number;
  helperMode: boolean;
  lastMode: GameMode;
  selectedTrainId: string;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const STEAM_TRAINS_STORAGE_KEY = "steam-trains.preferences.v1";

const DEFAULT_PREFERENCES: SteamTrainsPreferences = {
  highestUnlockedLevel: 1,
  helperMode: true,
  lastMode: "levels",
  selectedTrainId: DEFAULT_STEAM_TRAIN_ID,
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const sanitizePreferences = (input: unknown): SteamTrainsPreferences => {
  if (!isObject(input)) {
    return DEFAULT_PREFERENCES;
  }

  const highestUnlockedLevel = Number(input.highestUnlockedLevel);
  const helperMode = Boolean(input.helperMode);
  const lastMode = input.lastMode === "free-play" ? "free-play" : "levels";
  const selectedTrainId =
    typeof input.selectedTrainId === "string" && hasTrainDefinition(input.selectedTrainId)
      ? input.selectedTrainId
      : DEFAULT_STEAM_TRAIN_ID;

  return {
    highestUnlockedLevel: Number.isFinite(highestUnlockedLevel) && highestUnlockedLevel > 0 ? highestUnlockedLevel : 1,
    helperMode,
    lastMode,
    selectedTrainId,
  };
};

export const loadSteamTrainsPreferences = (storage: StorageLike): SteamTrainsPreferences => {
  const raw = storage.getItem(STEAM_TRAINS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    return sanitizePreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const saveSteamTrainsPreferences = (storage: StorageLike, preferences: SteamTrainsPreferences) => {
  const payload = sanitizePreferences(preferences);
  storage.setItem(STEAM_TRAINS_STORAGE_KEY, JSON.stringify(payload));
};

export const getDefaultSteamTrainsPreferences = (): SteamTrainsPreferences => ({
  ...DEFAULT_PREFERENCES,
});
