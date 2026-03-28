"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultSteamTrainsPreferences = exports.saveSteamTrainsPreferences = exports.loadSteamTrainsPreferences = exports.sanitizePreferences = exports.STEAM_TRAINS_STORAGE_KEY = void 0;
const trainCatalog_1 = require("./trainCatalog");
exports.STEAM_TRAINS_STORAGE_KEY = "steam-trains.preferences.v1";
const DEFAULT_PREFERENCES = {
    highestUnlockedLevel: 1,
    helperMode: true,
    lastMode: "levels",
    selectedTrainId: trainCatalog_1.DEFAULT_STEAM_TRAIN_ID,
};
const isObject = (value) => typeof value === "object" && value !== null;
const sanitizePreferences = (input) => {
    if (!isObject(input)) {
        return DEFAULT_PREFERENCES;
    }
    const highestUnlockedLevel = Number(input.highestUnlockedLevel);
    const helperMode = Boolean(input.helperMode);
    const lastMode = input.lastMode === "free-play" ? "free-play" : "levels";
    const selectedTrainId = typeof input.selectedTrainId === "string" && (0, trainCatalog_1.hasTrainDefinition)(input.selectedTrainId)
        ? input.selectedTrainId
        : trainCatalog_1.DEFAULT_STEAM_TRAIN_ID;
    return {
        highestUnlockedLevel: Number.isFinite(highestUnlockedLevel) && highestUnlockedLevel > 0 ? highestUnlockedLevel : 1,
        helperMode,
        lastMode,
        selectedTrainId,
    };
};
exports.sanitizePreferences = sanitizePreferences;
const loadSteamTrainsPreferences = (storage) => {
    const raw = storage.getItem(exports.STEAM_TRAINS_STORAGE_KEY);
    if (!raw) {
        return DEFAULT_PREFERENCES;
    }
    try {
        return (0, exports.sanitizePreferences)(JSON.parse(raw));
    }
    catch {
        return DEFAULT_PREFERENCES;
    }
};
exports.loadSteamTrainsPreferences = loadSteamTrainsPreferences;
const saveSteamTrainsPreferences = (storage, preferences) => {
    const payload = (0, exports.sanitizePreferences)(preferences);
    storage.setItem(exports.STEAM_TRAINS_STORAGE_KEY, JSON.stringify(payload));
};
exports.saveSteamTrainsPreferences = saveSteamTrainsPreferences;
const getDefaultSteamTrainsPreferences = () => ({
    ...DEFAULT_PREFERENCES,
});
exports.getDefaultSteamTrainsPreferences = getDefaultSteamTrainsPreferences;
