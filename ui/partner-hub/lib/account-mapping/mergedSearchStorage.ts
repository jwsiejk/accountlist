import { type MergedSearchDatasetSelection } from "./mergedSearchDataset";

export const SAVED_SEARCHES_STORAGE_KEY =
  "partner-hub:account-mapping:saved-searches";
export const COLUMN_SELECTION_STORAGE_KEY =
  "partner-hub:account-mapping:merged-columns";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type MergedSearchStoredFilters = {
  search: string;
  vendorOwner: string;
  partnerOwner: string;
  matchType: string;
  overlapOnly: boolean;
  statusRule: string;
};

export type SavedSearchPreset = {
  id: string;
  name: string;
  createdAt: string;
  filters: MergedSearchStoredFilters;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const parseJSON = (value: string | null): unknown => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const isMergedSearchStoredFilters = (
  value: unknown,
): value is MergedSearchStoredFilters =>
  isRecord(value) &&
  typeof value.search === "string" &&
  typeof value.vendorOwner === "string" &&
  typeof value.partnerOwner === "string" &&
  typeof value.matchType === "string" &&
  typeof value.overlapOnly === "boolean" &&
  typeof value.statusRule === "string";

const isSavedSearchPreset = (value: unknown): value is SavedSearchPreset =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.createdAt === "string" &&
  isMergedSearchStoredFilters(value.filters);

export const loadSavedSearches = (storage: StorageLike): SavedSearchPreset[] => {
  const parsed = parseJSON(storage.getItem(SAVED_SEARCHES_STORAGE_KEY));
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isSavedSearchPreset);
};

export const saveSavedSearches = (
  storage: StorageLike,
  presets: SavedSearchPreset[],
) => {
  storage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(presets));
};

type ColumnSelectionMap = Partial<Record<MergedSearchDatasetSelection, string[]>>;

export const loadColumnSelections = (storage: StorageLike): ColumnSelectionMap => {
  const parsed = parseJSON(storage.getItem(COLUMN_SELECTION_STORAGE_KEY));
  if (!isRecord(parsed)) {
    return {};
  }

  const selections: ColumnSelectionMap = {};
  (Object.keys(parsed) as MergedSearchDatasetSelection[]).forEach((key) => {
    const value = parsed[key];
    if (isStringArray(value)) {
      selections[key] = value;
    }
  });

  return selections;
};

export const getColumnSelection = (
  storage: StorageLike,
  dataset: MergedSearchDatasetSelection,
): string[] => {
  const selections = loadColumnSelections(storage);
  return selections[dataset] ?? [];
};

export const saveColumnSelection = (
  storage: StorageLike,
  dataset: MergedSearchDatasetSelection,
  columns: string[],
) => {
  const selections = loadColumnSelections(storage);
  selections[dataset] = columns;
  storage.setItem(COLUMN_SELECTION_STORAGE_KEY, JSON.stringify(selections));
};

export const resolveColumnSelection = (
  stored: string[],
  headers: string[],
  fallback: string[],
) => {
  const validStored = stored.filter((column) => headers.includes(column));
  if (validStored.length > 0) {
    return validStored;
  }
  return fallback.filter((column) => headers.includes(column));
};
