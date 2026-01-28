"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveColumnSelection = exports.saveColumnSelection = exports.getColumnSelection = exports.loadColumnSelections = exports.saveSavedSearches = exports.loadSavedSearches = exports.COLUMN_SELECTION_STORAGE_KEY = exports.SAVED_SEARCHES_STORAGE_KEY = void 0;
exports.SAVED_SEARCHES_STORAGE_KEY = "partner-hub:account-mapping:saved-searches";
exports.COLUMN_SELECTION_STORAGE_KEY = "partner-hub:account-mapping:merged-columns";
const isRecord = (value) => typeof value === "object" && value !== null;
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
const parseJSON = (value) => {
    if (!value) {
        return null;
    }
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
};
const isMergedSearchStoredFilters = (value) => isRecord(value) &&
    typeof value.search === "string" &&
    typeof value.vendorOwner === "string" &&
    typeof value.partnerOwner === "string" &&
    typeof value.matchType === "string" &&
    typeof value.overlapOnly === "boolean" &&
    typeof value.statusRule === "string";
const isSavedSearchPreset = (value) => isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.createdAt === "string" &&
    isMergedSearchStoredFilters(value.filters);
const loadSavedSearches = (storage) => {
    const parsed = parseJSON(storage.getItem(exports.SAVED_SEARCHES_STORAGE_KEY));
    if (!Array.isArray(parsed)) {
        return [];
    }
    return parsed.filter(isSavedSearchPreset);
};
exports.loadSavedSearches = loadSavedSearches;
const saveSavedSearches = (storage, presets) => {
    storage.setItem(exports.SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(presets));
};
exports.saveSavedSearches = saveSavedSearches;
const loadColumnSelections = (storage) => {
    const parsed = parseJSON(storage.getItem(exports.COLUMN_SELECTION_STORAGE_KEY));
    if (!isRecord(parsed)) {
        return {};
    }
    const selections = {};
    Object.keys(parsed).forEach((key) => {
        const value = parsed[key];
        if (isStringArray(value)) {
            selections[key] = value;
        }
    });
    return selections;
};
exports.loadColumnSelections = loadColumnSelections;
const getColumnSelection = (storage, dataset) => {
    const selections = (0, exports.loadColumnSelections)(storage);
    return selections[dataset] ?? [];
};
exports.getColumnSelection = getColumnSelection;
const saveColumnSelection = (storage, dataset, columns) => {
    const selections = (0, exports.loadColumnSelections)(storage);
    selections[dataset] = columns;
    storage.setItem(exports.COLUMN_SELECTION_STORAGE_KEY, JSON.stringify(selections));
};
exports.saveColumnSelection = saveColumnSelection;
const resolveColumnSelection = (stored, headers, fallback) => {
    const validStored = stored.filter((column) => headers.includes(column));
    if (validStored.length > 0) {
        return validStored;
    }
    return fallback.filter((column) => headers.includes(column));
};
exports.resolveColumnSelection = resolveColumnSelection;
