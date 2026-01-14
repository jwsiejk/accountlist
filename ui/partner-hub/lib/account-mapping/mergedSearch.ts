export type MergedSearchRow = Record<string, string>;

export type MergedSearchFilters = {
  search: string;
  vendorOwner: string;
  partnerOwner: string;
  matchType: string;
  overlapOnly: boolean;
  statusRule: string;
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
  const normalizedStatusRule = normalize(filters.statusRule);

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

    if (normalizedStatusRule && normalizedStatusRule !== "any") {
      const vendorStatus = normalize(row.vendor_status ?? "");
      const partnerStatus = normalize(row.partner_status ?? "");
      if (normalizedStatusRule === "vendor-customer-partner-prospect") {
        if (vendorStatus !== "customer" || partnerStatus !== "prospect") {
          return false;
        }
      }
      if (normalizedStatusRule === "vendor-prospect-partner-customer") {
        if (vendorStatus !== "prospect" || partnerStatus !== "customer") {
          return false;
        }
      }
      if (normalizedStatusRule === "either-customer") {
        if (vendorStatus !== "customer" && partnerStatus !== "customer") {
          return false;
        }
      }
    }

    if (!normalizedSearch) {
      return true;
    }

    return Object.values(row).some((value) =>
      normalize(value).includes(normalizedSearch),
    );
  });
};
