import type { MergedSearchRow } from "./mergedSearch";

export type FilterKey =
  | "accountNames"
  | "vendorOwner"
  | "vendorRegion"
  | "vendorOrganization"
  | "vendorStatus"
  | "partnerOwner"
  | "partnerRegion"
  | "partnerOrganization"
  | "partnerStatus";

export type MergedSearchFilterState = {
  accountNames: string[];
  vendorOwner: string;
  vendorRegion: string;
  vendorOrganization: string;
  vendorStatus: string;
  partnerOwner: string;
  partnerRegion: string;
  partnerOrganization: string;
  partnerStatus: string;
};

export type FilterOptions = Record<FilterKey, string[]>;
export type FilterOptionWithCount = {
  value: string;
  count: number;
};
export type FilterOptionsWithCounts = Record<FilterKey, FilterOptionWithCount[]>;

const normalizeValue = (value: string) => value.trim().toLowerCase();

const matchesExact = (value: string | undefined, filter: string) =>
  normalizeValue(value ?? "") === normalizeValue(filter);

const matchesAccountNames = (row: MergedSearchRow, accountNames: string[]) => {
  if (accountNames.length === 0) {
    return true;
  }
  const vendorName = normalizeValue(row.vendor_account_name ?? "");
  const partnerName = normalizeValue(row.partner_account_name ?? "");
  return accountNames.some((name) => {
    const normalized = normalizeValue(name);
    return normalized === vendorName || normalized === partnerName;
  });
};

export const buildBaseRows = (rows: MergedSearchRow[], overlapOnly: boolean) => {
  if (!overlapOnly) {
    return rows;
  }
  return rows.filter(
    (row) =>
      Boolean(row.vendor_account_name?.trim()) &&
      Boolean(row.partner_account_name?.trim()),
  );
};

export const getEligibleRows = ({
  rows,
  filters,
  excludeKey,
}: {
  rows: MergedSearchRow[];
  filters: MergedSearchFilterState;
  excludeKey?: FilterKey;
}) =>
  rows.filter((row) => {
    if (excludeKey !== "accountNames" && filters.accountNames.length > 0) {
      if (!matchesAccountNames(row, filters.accountNames)) {
        return false;
      }
    }
    if (excludeKey !== "vendorOwner" && filters.vendorOwner) {
      if (!matchesExact(row.vendor_owner, filters.vendorOwner)) {
        return false;
      }
    }
    if (excludeKey !== "vendorRegion" && filters.vendorRegion) {
      if (!matchesExact(row.vendor_region, filters.vendorRegion)) {
        return false;
      }
    }
    if (excludeKey !== "vendorOrganization" && filters.vendorOrganization) {
      if (!matchesExact(row.vendor_organization, filters.vendorOrganization)) {
        return false;
      }
    }
    if (excludeKey !== "vendorStatus" && filters.vendorStatus) {
      if (!matchesExact(row.vendor_status, filters.vendorStatus)) {
        return false;
      }
    }
    if (excludeKey !== "partnerOwner" && filters.partnerOwner) {
      if (!matchesExact(row.partner_owner, filters.partnerOwner)) {
        return false;
      }
    }
    if (excludeKey !== "partnerRegion" && filters.partnerRegion) {
      if (!matchesExact(row.partner_region, filters.partnerRegion)) {
        return false;
      }
    }
    if (excludeKey !== "partnerOrganization" && filters.partnerOrganization) {
      if (!matchesExact(row.partner_organization, filters.partnerOrganization)) {
        return false;
      }
    }
    if (excludeKey !== "partnerStatus" && filters.partnerStatus) {
      if (!matchesExact(row.partner_status, filters.partnerStatus)) {
        return false;
      }
    }
    return true;
  });

const collectOptions = (rows: MergedSearchRow[], keys: string[]) => {
  const values = new Set<string>();
  rows.forEach((row) => {
    keys.forEach((key) => {
      const value = row[key]?.trim();
      if (value) {
        values.add(value);
      }
    });
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b));
};

const collectOptionCounts = (rows: MergedSearchRow[], keys: string[]) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const rowValues = new Set<string>();
    keys.forEach((key) => {
      const value = row[key]?.trim();
      if (value) {
        rowValues.add(value);
      }
    });
    rowValues.forEach((value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort(
      (a, b) =>
        b.count - a.count || a.value.localeCompare(b.value, undefined, { sensitivity: "base" }),
    );
};

export const buildOptionsFor = ({
  rows,
  filters,
  firstFilterKey,
}: {
  rows: MergedSearchRow[];
  filters: MergedSearchFilterState;
  firstFilterKey: FilterKey | null;
}): FilterOptions => {
  const keys: FilterKey[] = [
    "accountNames",
    "vendorOwner",
    "vendorRegion",
    "vendorOrganization",
    "vendorStatus",
    "partnerOwner",
    "partnerRegion",
    "partnerOrganization",
    "partnerStatus",
  ];

  return keys.reduce<FilterOptions>((acc, key) => {
    const eligibleRows =
      firstFilterKey && key === firstFilterKey
        ? rows
        : getEligibleRows({ rows, filters, excludeKey: key });

    if (key === "accountNames") {
      acc[key] = collectOptions(eligibleRows, [
        "vendor_account_name",
        "partner_account_name",
      ]);
      return acc;
    }
    if (key === "vendorOwner") {
      acc[key] = collectOptions(eligibleRows, ["vendor_owner"]);
      return acc;
    }
    if (key === "vendorRegion") {
      acc[key] = collectOptions(eligibleRows, ["vendor_region"]);
      return acc;
    }
    if (key === "vendorOrganization") {
      acc[key] = collectOptions(eligibleRows, ["vendor_organization"]);
      return acc;
    }
    if (key === "vendorStatus") {
      acc[key] = collectOptions(eligibleRows, ["vendor_status"]);
      return acc;
    }
    if (key === "partnerOwner") {
      acc[key] = collectOptions(eligibleRows, ["partner_owner"]);
      return acc;
    }
    if (key === "partnerRegion") {
      acc[key] = collectOptions(eligibleRows, ["partner_region"]);
      return acc;
    }
    if (key === "partnerOrganization") {
      acc[key] = collectOptions(eligibleRows, ["partner_organization"]);
      return acc;
    }
    acc[key] = collectOptions(eligibleRows, ["partner_status"]);
    return acc;
  }, {} as FilterOptions);
};

export const buildOptionsWithCounts = ({
  rows,
  filters,
  firstFilterKey,
}: {
  rows: MergedSearchRow[];
  filters: MergedSearchFilterState;
  firstFilterKey: FilterKey | null;
}): FilterOptionsWithCounts => {
  const keys: FilterKey[] = [
    "accountNames",
    "vendorOwner",
    "vendorRegion",
    "vendorOrganization",
    "vendorStatus",
    "partnerOwner",
    "partnerRegion",
    "partnerOrganization",
    "partnerStatus",
  ];

  return keys.reduce<FilterOptionsWithCounts>((acc, key) => {
    const eligibleRows =
      firstFilterKey && key === firstFilterKey
        ? rows
        : getEligibleRows({ rows, filters, excludeKey: key });

    if (key === "accountNames") {
      acc[key] = collectOptionCounts(eligibleRows, [
        "vendor_account_name",
        "partner_account_name",
      ]);
      return acc;
    }
    if (key === "vendorOwner") {
      acc[key] = collectOptionCounts(eligibleRows, ["vendor_owner"]);
      return acc;
    }
    if (key === "vendorRegion") {
      acc[key] = collectOptionCounts(eligibleRows, ["vendor_region"]);
      return acc;
    }
    if (key === "vendorOrganization") {
      acc[key] = collectOptionCounts(eligibleRows, ["vendor_organization"]);
      return acc;
    }
    if (key === "vendorStatus") {
      acc[key] = collectOptionCounts(eligibleRows, ["vendor_status"]);
      return acc;
    }
    if (key === "partnerOwner") {
      acc[key] = collectOptionCounts(eligibleRows, ["partner_owner"]);
      return acc;
    }
    if (key === "partnerRegion") {
      acc[key] = collectOptionCounts(eligibleRows, ["partner_region"]);
      return acc;
    }
    if (key === "partnerOrganization") {
      acc[key] = collectOptionCounts(eligibleRows, ["partner_organization"]);
      return acc;
    }
    acc[key] = collectOptionCounts(eligibleRows, ["partner_status"]);
    return acc;
  }, {} as FilterOptionsWithCounts);
};

const isValidSelection = (value: string, options: string[]) => {
  if (!value) {
    return true;
  }
  const normalizedValue = normalizeValue(value);
  return options.some((option) => normalizeValue(option) === normalizedValue);
};

const filterValidSelections = (values: string[], options: string[]) => {
  if (values.length === 0) {
    return values;
  }
  const optionByValue = new Map<string, string>();
  options.forEach((option) => {
    optionByValue.set(normalizeValue(option), option);
  });
  return values
    .map((value) => optionByValue.get(normalizeValue(value)))
    .filter((value): value is string => Boolean(value));
};

export const clearInvalidFilters = (
  filters: MergedSearchFilterState,
  optionsFor: FilterOptions,
): MergedSearchFilterState => {
  const next = { ...filters };

  next.accountNames = filterValidSelections(filters.accountNames, optionsFor.accountNames);
  if (!isValidSelection(filters.vendorOwner, optionsFor.vendorOwner)) {
    next.vendorOwner = "";
  }
  if (!isValidSelection(filters.vendorRegion, optionsFor.vendorRegion)) {
    next.vendorRegion = "";
  }
  if (!isValidSelection(filters.vendorOrganization, optionsFor.vendorOrganization)) {
    next.vendorOrganization = "";
  }
  if (!isValidSelection(filters.vendorStatus, optionsFor.vendorStatus)) {
    next.vendorStatus = "";
  }
  if (!isValidSelection(filters.partnerOwner, optionsFor.partnerOwner)) {
    next.partnerOwner = "";
  }
  if (!isValidSelection(filters.partnerRegion, optionsFor.partnerRegion)) {
    next.partnerRegion = "";
  }
  if (!isValidSelection(filters.partnerOrganization, optionsFor.partnerOrganization)) {
    next.partnerOrganization = "";
  }
  if (!isValidSelection(filters.partnerStatus, optionsFor.partnerStatus)) {
    next.partnerStatus = "";
  }

  return next;
};

export const createEmptyFilterState = (): MergedSearchFilterState => ({
  accountNames: [],
  vendorOwner: "",
  vendorRegion: "",
  vendorOrganization: "",
  vendorStatus: "",
  partnerOwner: "",
  partnerRegion: "",
  partnerOrganization: "",
  partnerStatus: "",
});

export const isFilterStateEmpty = (filters: MergedSearchFilterState) =>
  filters.accountNames.length === 0 &&
  Object.values(filters).every((value) => (Array.isArray(value) ? true : !value));
