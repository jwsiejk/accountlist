import {
  buildTrainDefinitionFromSelection,
  sanitizeTrainBuilderSelection,
  toCustomTrainId,
  type TrainBuilderSelection,
} from "./builder";
import { DEFAULT_STEAM_TRAIN_ID, hasTrainDefinition } from "./trainCatalog";
import type { GameMode, TrainDefinition } from "./types";

export type SteamTrainsPreferences = {
  highestUnlockedLevel: number;
  helperMode: boolean;
  lastMode: GameMode;
  selectedTrainId: string;
};

export type SavedCustomTrain = {
  id: string;
  selection: TrainBuilderSelection;
  train: TrainDefinition;
  createdAtMs: number;
  updatedAtMs: number;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const STEAM_TRAINS_STORAGE_KEY = "steam-trains.preferences.v1";
export const STEAM_TRAINS_CUSTOM_STORAGE_KEY = "steam-trains.custom.v1";

const DEFAULT_PREFERENCES: SteamTrainsPreferences = {
  highestUnlockedLevel: 1,
  helperMode: true,
  lastMode: "levels",
  selectedTrainId: DEFAULT_STEAM_TRAIN_ID,
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const sanitizePreferences = (
  input: unknown,
  hasTrain: (id: string) => boolean = hasTrainDefinition,
): SteamTrainsPreferences => {
  if (!isObject(input)) {
    return DEFAULT_PREFERENCES;
  }

  const highestUnlockedLevel = Number(input.highestUnlockedLevel);
  const helperMode = Boolean(input.helperMode);
  const lastMode = input.lastMode === "free-play" ? "free-play" : "levels";
  const selectedTrainId = typeof input.selectedTrainId === "string" && hasTrain(input.selectedTrainId)
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

export const loadSavedCustomTrains = (storage: StorageLike): SavedCustomTrain[] => {
  const raw = storage.getItem(STEAM_TRAINS_CUSTOM_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (!isObject(entry) || typeof entry.id !== "string") {
        return [];
      }
      const selection = sanitizeTrainBuilderSelection(entry.selection);
      try {
        return [{
          id: entry.id,
          selection,
          train: buildTrainDefinitionFromSelection(selection, entry.id),
          createdAtMs: Number(entry.createdAtMs) || Date.now(),
          updatedAtMs: Number(entry.updatedAtMs) || Date.now(),
        } satisfies SavedCustomTrain];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
};

export const saveCustomTrains = (storage: StorageLike, trains: SavedCustomTrain[]) => {
  const payload = trains.map((train) => ({
    id: train.id,
    selection: sanitizeTrainBuilderSelection(train.selection),
    createdAtMs: train.createdAtMs,
    updatedAtMs: train.updatedAtMs,
  }));
  storage.setItem(STEAM_TRAINS_CUSTOM_STORAGE_KEY, JSON.stringify(payload));
};

export const createSavedCustomTrain = (selection: TrainBuilderSelection, nowMs = Date.now()): SavedCustomTrain => {
  const id = toCustomTrainId(selection, nowMs);
  const sanitizedSelection = sanitizeTrainBuilderSelection(selection);
  return {
    id,
    selection: sanitizedSelection,
    train: buildTrainDefinitionFromSelection(sanitizedSelection, id),
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
};

export const getDefaultSteamTrainsPreferences = (): SteamTrainsPreferences => ({
  ...DEFAULT_PREFERENCES,
});
