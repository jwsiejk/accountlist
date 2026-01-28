"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFilterStateEmpty = exports.createEmptyFilterState = exports.clearInvalidFilters = exports.buildOptionsWithCounts = exports.buildOptionsFor = exports.getEligibleRows = exports.buildBaseRows = void 0;
const normalizeValue = (value) => value.trim().toLowerCase();
const matchesExact = (value, filter) => normalizeValue(value ?? "") === normalizeValue(filter);
const matchesAccountNames = (row, accountNames) => {
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
const buildBaseRows = (rows, overlapOnly) => {
    if (!overlapOnly) {
        return rows;
    }
    return rows.filter((row) => Boolean(row.vendor_account_name?.trim()) &&
        Boolean(row.partner_account_name?.trim()));
};
exports.buildBaseRows = buildBaseRows;
const getEligibleRows = ({ rows, filters, excludeKey, }) => rows.filter((row) => {
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
exports.getEligibleRows = getEligibleRows;
const collectOptions = (rows, keys) => {
    const values = new Set();
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
const collectOptionCounts = (rows, keys) => {
    const counts = new Map();
    rows.forEach((row) => {
        const rowValues = new Set();
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
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, undefined, { sensitivity: "base" }));
};
const buildOptionsFor = ({ rows, filters, firstFilterKey, }) => {
    const keys = [
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
    return keys.reduce((acc, key) => {
        const eligibleRows = firstFilterKey && key === firstFilterKey
            ? rows
            : (0, exports.getEligibleRows)({ rows, filters, excludeKey: key });
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
    }, {});
};
exports.buildOptionsFor = buildOptionsFor;
const buildOptionsWithCounts = ({ rows, filters, firstFilterKey, }) => {
    const keys = [
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
    return keys.reduce((acc, key) => {
        const eligibleRows = firstFilterKey && key === firstFilterKey
            ? rows
            : (0, exports.getEligibleRows)({ rows, filters, excludeKey: key });
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
    }, {});
};
exports.buildOptionsWithCounts = buildOptionsWithCounts;
const isValidSelection = (value, options) => {
    if (!value) {
        return true;
    }
    const normalizedValue = normalizeValue(value);
    return options.some((option) => normalizeValue(option) === normalizedValue);
};
const filterValidSelections = (values, options) => {
    if (values.length === 0) {
        return values;
    }
    const optionByValue = new Map();
    options.forEach((option) => {
        optionByValue.set(normalizeValue(option), option);
    });
    return values
        .map((value) => optionByValue.get(normalizeValue(value)))
        .filter((value) => Boolean(value));
};
const clearInvalidFilters = (filters, optionsFor) => {
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
exports.clearInvalidFilters = clearInvalidFilters;
const createEmptyFilterState = () => ({
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
exports.createEmptyFilterState = createEmptyFilterState;
const isFilterStateEmpty = (filters) => filters.accountNames.length === 0 &&
    Object.values(filters).every((value) => (Array.isArray(value) ? true : !value));
exports.isFilterStateEmpty = isFilterStateEmpty;
