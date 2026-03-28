"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultSteamTrainsPreferences = exports.createSavedCustomTrain = exports.saveCustomTrains = exports.loadSavedCustomTrains = exports.saveSteamTrainsPreferences = exports.loadSteamTrainsPreferences = exports.sanitizePreferences = exports.STEAM_TRAINS_CUSTOM_STORAGE_KEY = exports.STEAM_TRAINS_STORAGE_KEY = void 0;
const builder_1 = require("./builder");
const trainCatalog_1 = require("./trainCatalog");
exports.STEAM_TRAINS_STORAGE_KEY = "steam-trains.preferences.v2";
exports.STEAM_TRAINS_CUSTOM_STORAGE_KEY = "steam-trains.custom.v1";
const DEFAULT_PREFERENCES = {
    highestUnlockedLevel: 1,
    helperMode: true,
    lastMode: "levels",
    selectedTrainId: trainCatalog_1.DEFAULT_STEAM_TRAIN_ID,
    levelProgress: {},
};
const isObject = (value) => typeof value === "object" && value !== null;
const sanitizeLevelProgress = (input) => {
    if (!isObject(input)) {
        return {};
    }
    return Object.entries(input).reduce((acc, [key, value]) => {
        if (!isObject(value)) {
            return acc;
        }
        const stars = Number(value.stars);
        const bestRunRaw = isObject(value.bestRun) ? value.bestRun : {};
        acc[key] = {
            stars: Number.isFinite(stars) ? Math.min(3, Math.max(0, Math.floor(stars))) : 0,
            bestRun: {
                completed: Boolean(bestRunRaw.completed),
                crashed: Boolean(bestRunRaw.crashed),
                stationStopPerfect: Boolean(bestRunRaw.stationStopPerfect),
            },
        };
        return acc;
    }, {});
};
const sanitizePreferences = (input, hasTrain = trainCatalog_1.hasTrainDefinition) => {
    if (!isObject(input)) {
        return DEFAULT_PREFERENCES;
    }
    const highestUnlockedLevel = Number(input.highestUnlockedLevel);
    const helperMode = Boolean(input.helperMode);
    const lastMode = input.lastMode === "free-play" ? "free-play" : "levels";
    const selectedTrainId = typeof input.selectedTrainId === "string" && hasTrain(input.selectedTrainId)
        ? input.selectedTrainId
        : trainCatalog_1.DEFAULT_STEAM_TRAIN_ID;
    return {
        highestUnlockedLevel: Number.isFinite(highestUnlockedLevel) && highestUnlockedLevel > 0 ? highestUnlockedLevel : 1,
        helperMode,
        lastMode,
        selectedTrainId,
        levelProgress: sanitizeLevelProgress(input.levelProgress),
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
const loadSavedCustomTrains = (storage) => {
    const raw = storage.getItem(exports.STEAM_TRAINS_CUSTOM_STORAGE_KEY);
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
            const selection = (0, builder_1.sanitizeTrainBuilderSelection)(entry.selection);
            try {
                return [{
                        id: entry.id,
                        selection,
                        train: (0, builder_1.buildTrainDefinitionFromSelection)(selection, entry.id),
                        createdAtMs: Number(entry.createdAtMs) || Date.now(),
                        updatedAtMs: Number(entry.updatedAtMs) || Date.now(),
                    }];
            }
            catch {
                return [];
            }
        });
    }
    catch {
        return [];
    }
};
exports.loadSavedCustomTrains = loadSavedCustomTrains;
const saveCustomTrains = (storage, trains) => {
    const payload = trains.map((train) => ({
        id: train.id,
        selection: (0, builder_1.sanitizeTrainBuilderSelection)(train.selection),
        createdAtMs: train.createdAtMs,
        updatedAtMs: train.updatedAtMs,
    }));
    storage.setItem(exports.STEAM_TRAINS_CUSTOM_STORAGE_KEY, JSON.stringify(payload));
};
exports.saveCustomTrains = saveCustomTrains;
const createSavedCustomTrain = (selection, nowMs = Date.now()) => {
    const id = (0, builder_1.toCustomTrainId)(selection, nowMs);
    const sanitizedSelection = (0, builder_1.sanitizeTrainBuilderSelection)(selection);
    return {
        id,
        selection: sanitizedSelection,
        train: (0, builder_1.buildTrainDefinitionFromSelection)(sanitizedSelection, id),
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
    };
};
exports.createSavedCustomTrain = createSavedCustomTrain;
const getDefaultSteamTrainsPreferences = () => ({
    ...DEFAULT_PREFERENCES,
});
exports.getDefaultSteamTrainsPreferences = getDefaultSteamTrainsPreferences;
