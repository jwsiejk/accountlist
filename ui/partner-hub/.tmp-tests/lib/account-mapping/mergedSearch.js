"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterMergedSearchRows = void 0;
const normalize = (value) => value.trim().toLowerCase();
const matchesTextFilter = (value, filterValue) => {
    if (!filterValue) {
        return true;
    }
    if (!value) {
        return false;
    }
    return normalize(value).includes(normalize(filterValue));
};
const filterMergedSearchRows = (rows, filters) => {
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
        return Object.values(row).some((value) => normalize(value).includes(normalizedSearch));
    });
};
exports.filterMergedSearchRows = filterMergedSearchRows;
