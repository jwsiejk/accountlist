import type { MergedSearchRow } from "./mergedSearch";

export type FilterKey =
  | "vendorOwner"
  | "partnerOwner"
  | "region"
  | "organization"
  | "custProspect";

export type MergedSearchFilterState = {
  vendorOwner: string;
  partnerOwner: string;
  region: string;
  organization: string;
  custProspect: string;
};

export type FilterOptions = Record<FilterKey, string[]>;

const normalizeValue = (value: string) => value.trim().toLowerCase();

const matchesExact = (value: string | undefined, filter: string) =>
  normalizeValue(value ?? "") === normalizeValue(filter);

const matchesEitherField = (row: MergedSearchRow, filter: string, keys: string[]) =>
  keys.some((key) => matchesExact(row[key], filter));

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
    if (excludeKey !== "vendorOwner" && filters.vendorOwner) {
      if (!matchesExact(row.vendor_owner, filters.vendorOwner)) {
        return false;
      }
    }
    if (excludeKey !== "partnerOwner" && filters.partnerOwner) {
      if (!matchesExact(row.partner_owner, filters.partnerOwner)) {
        return false;
      }
    }
    if (excludeKey !== "region" && filters.region) {
      if (
        !matchesEitherField(row, filters.region, [
          "vendor_region",
          "partner_region",
        ])
      ) {
        return false;
      }
    }
    if (excludeKey !== "organization" && filters.organization) {
      if (
        !matchesEitherField(row, filters.organization, [
          "vendor_organization",
          "partner_organization",
        ])
      ) {
        return false;
      }
    }
    if (excludeKey !== "custProspect" && filters.custProspect) {
      if (
        !matchesEitherField(row, filters.custProspect, [
          "vendor_status",
          "partner_status",
        ])
      ) {
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
    "vendorOwner",
    "partnerOwner",
    "region",
    "organization",
    "custProspect",
  ];

  return keys.reduce<FilterOptions>((acc, key) => {
    const eligibleRows =
      firstFilterKey && key === firstFilterKey
        ? rows
        : getEligibleRows({ rows, filters, excludeKey: key });

    if (key === "vendorOwner") {
      acc[key] = collectOptions(eligibleRows, ["vendor_owner"]);
      return acc;
    }
    if (key === "partnerOwner") {
      acc[key] = collectOptions(eligibleRows, ["partner_owner"]);
      return acc;
    }
    if (key === "region") {
      acc[key] = collectOptions(eligibleRows, ["vendor_region", "partner_region"]);
      return acc;
    }
    if (key === "organization") {
      acc[key] = collectOptions(eligibleRows, [
        "vendor_organization",
        "partner_organization",
      ]);
      return acc;
    }
    acc[key] = collectOptions(eligibleRows, ["vendor_status", "partner_status"]);
    return acc;
  }, {} as FilterOptions);
};

const isValidSelection = (value: string, options: string[]) => {
  if (!value) {
    return true;
  }
  const normalizedValue = normalizeValue(value);
  return options.some((option) => normalizeValue(option) === normalizedValue);
};

export const clearInvalidFilters = (
  filters: MergedSearchFilterState,
  optionsFor: FilterOptions,
): MergedSearchFilterState => {
  const next = { ...filters };

  if (!isValidSelection(filters.vendorOwner, optionsFor.vendorOwner)) {
    next.vendorOwner = "";
  }
  if (!isValidSelection(filters.partnerOwner, optionsFor.partnerOwner)) {
    next.partnerOwner = "";
  }
  if (!isValidSelection(filters.region, optionsFor.region)) {
    next.region = "";
  }
  if (!isValidSelection(filters.organization, optionsFor.organization)) {
    next.organization = "";
  }
  if (!isValidSelection(filters.custProspect, optionsFor.custProspect)) {
    next.custProspect = "";
  }

  return next;
};
