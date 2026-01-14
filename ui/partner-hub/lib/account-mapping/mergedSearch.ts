export type MergedSearchRow = Record<string, string>;

export type MergedSearchFilters = {
  search: string;
  vendorOwner: string;
  partnerOwner: string;
  matchType: string;
  overlapOnly: boolean;
};

const normalize = (value: string) => value.trim().toLowerCase();

const matchesTextFilter = (value: string, filterValue: string) => {
  if (!filterValue) {
    return true;
  }
  if (!value) {
    return false;
  }
  return normalize(value).includes(normalize(filterValue));
};

export const filterMergedSearchRows = (
  rows: MergedSearchRow[],
  filters: MergedSearchFilters,
) => {
  const normalizedSearch = normalize(filters.search);

  return rows.filter((row) => {
    if (filters.overlapOnly) {
      const partnerName = row.partner_account_name?.trim() ?? "";
      if (!partnerName) {
        return false;
      }
    }

    if (!matchesTextFilter(row.vendor_owner ?? "", filters.vendorOwner)) {
      return false;
    }

    if (!matchesTextFilter(row.partner_owner ?? "", filters.partnerOwner)) {
      return false;
    }

    if (!matchesTextFilter(row.match_type ?? "", filters.matchType)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return Object.values(row).some((value) =>
      normalize(value).includes(normalizedSearch),
    );
  });
};
