"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mergedSearchFilters_1 = require("./mergedSearchFilters");
(0, node_test_1.describe)("merged search cascading filters", () => {
    const rows = [
        {
            vendor_account_name: "Vendor One",
            partner_account_name: "Partner One",
            vendor_owner: "Alice",
            partner_owner: "Bob",
            vendor_region: "West",
            partner_region: "East",
            vendor_organization: "OrgA",
            partner_organization: "OrgB",
            vendor_status: "Customer",
            partner_status: "Prospect",
        },
        {
            vendor_account_name: "Vendor Two",
            partner_account_name: "Partner Two",
            vendor_owner: "Alice",
            partner_owner: "Cara",
            vendor_region: "West",
            partner_region: "South",
            vendor_organization: "OrgA",
            partner_organization: "OrgC",
            vendor_status: "Prospect",
            partner_status: "Customer",
        },
        {
            vendor_account_name: "Vendor Three",
            partner_account_name: "",
            vendor_owner: "Dan",
            partner_owner: "",
            vendor_region: "North",
            partner_region: "",
            vendor_organization: "OrgD",
            partner_organization: "",
            vendor_status: "Customer",
            partner_status: "",
        },
    ];
    const baseFilters = {
        accountNames: [],
        vendorOwner: "Alice",
        vendorRegion: "",
        vendorOrganization: "",
        vendorStatus: "",
        partnerOwner: "",
        partnerRegion: "South",
        partnerOrganization: "",
        partnerStatus: "",
    };
    (0, node_test_1.it)("filters eligible rows while excluding one key", () => {
        const eligibleRows = (0, mergedSearchFilters_1.getEligibleRows)({
            rows,
            filters: baseFilters,
            excludeKey: "partnerRegion",
        });
        assert.equal(eligibleRows.length, 2);
        assert.equal(eligibleRows[0].vendor_owner, "Alice");
    });
    (0, node_test_1.it)("matches account names on either side", () => {
        const eligibleRows = (0, mergedSearchFilters_1.getEligibleRows)({
            rows,
            filters: {
                ...baseFilters,
                accountNames: ["partner two"],
                vendorOwner: "",
                partnerRegion: "",
            },
        });
        assert.equal(eligibleRows.length, 1);
        assert.equal(eligibleRows[0].partner_account_name, "Partner Two");
    });
    (0, node_test_1.it)("does not match partner values for vendor-only filters", () => {
        const eligibleRows = (0, mergedSearchFilters_1.getEligibleRows)({
            rows,
            filters: {
                ...baseFilters,
                vendorOwner: "",
                partnerRegion: "",
                vendorRegion: "East",
            },
        });
        assert.equal(eligibleRows.length, 0);
    });
    (0, node_test_1.it)("builds cascading options with a first filter key", () => {
        const baseRows = (0, mergedSearchFilters_1.buildBaseRows)(rows, true);
        const options = (0, mergedSearchFilters_1.buildOptionsFor)({
            rows: baseRows,
            filters: baseFilters,
            firstFilterKey: "vendorOwner",
        });
        assert.deepEqual(options.vendorOwner, ["Alice"]);
        assert.deepEqual(options.partnerRegion, ["East", "South"]);
    });
    (0, node_test_1.it)("clears invalid selections based on options", () => {
        const options = {
            accountNames: ["Vendor One", "Partner Two"],
            vendorOwner: ["Alice"],
            vendorRegion: ["West"],
            vendorOrganization: ["OrgA"],
            vendorStatus: ["Customer"],
            partnerOwner: ["Bob"],
            partnerRegion: ["East"],
            partnerOrganization: ["OrgB"],
            partnerStatus: ["Prospect"],
        };
        const cleaned = (0, mergedSearchFilters_1.clearInvalidFilters)({
            accountNames: ["Vendor One", "Missing"],
            vendorOwner: "Dan",
            vendorRegion: "East",
            vendorOrganization: "OrgA",
            vendorStatus: "Prospect",
            partnerOwner: "Bob",
            partnerRegion: "East",
            partnerOrganization: "OrgX",
            partnerStatus: "Prospect",
        }, options);
        assert.deepEqual(cleaned.accountNames, ["Vendor One"]);
        assert.equal(cleaned.vendorOwner, "");
        assert.equal(cleaned.vendorRegion, "");
        assert.equal(cleaned.vendorStatus, "");
        assert.equal(cleaned.partnerOrganization, "");
    });
    (0, node_test_1.it)("counts options per key using eligible rows", () => {
        const baseRows = (0, mergedSearchFilters_1.buildBaseRows)(rows, true);
        const options = (0, mergedSearchFilters_1.buildOptionsWithCounts)({
            rows: baseRows,
            filters: (0, mergedSearchFilters_1.createEmptyFilterState)(),
            firstFilterKey: null,
        });
        assert.deepEqual(options.accountNames, [
            { value: "Partner One", count: 1 },
            { value: "Partner Two", count: 1 },
            { value: "Vendor One", count: 1 },
            { value: "Vendor Two", count: 1 },
        ]);
        assert.deepEqual(options.vendorOwner, [{ value: "Alice", count: 2 }]);
        assert.deepEqual(options.partnerOwner, [
            { value: "Bob", count: 1 },
            { value: "Cara", count: 1 },
        ]);
        assert.deepEqual(options.vendorRegion, [{ value: "West", count: 2 }]);
        assert.deepEqual(options.partnerRegion, [
            { value: "East", count: 1 },
            { value: "South", count: 1 },
        ]);
        assert.deepEqual(options.vendorOrganization, [{ value: "OrgA", count: 2 }]);
        assert.deepEqual(options.partnerOrganization, [
            { value: "OrgB", count: 1 },
            { value: "OrgC", count: 1 },
        ]);
        assert.deepEqual(options.vendorStatus, [
            { value: "Customer", count: 1 },
            { value: "Prospect", count: 1 },
        ]);
        assert.deepEqual(options.partnerStatus, [
            { value: "Customer", count: 1 },
            { value: "Prospect", count: 1 },
        ]);
    });
    (0, node_test_1.it)("tracks when filter state is empty", () => {
        const emptyState = (0, mergedSearchFilters_1.createEmptyFilterState)();
        assert.equal((0, mergedSearchFilters_1.isFilterStateEmpty)(emptyState), true);
        assert.equal((0, mergedSearchFilters_1.isFilterStateEmpty)({
            ...emptyState,
            partnerRegion: "West",
        }), false);
    });
});
