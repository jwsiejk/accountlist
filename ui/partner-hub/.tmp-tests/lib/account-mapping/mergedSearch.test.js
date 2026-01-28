"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mergedSearch_1 = require("./mergedSearch");
(0, node_test_1.describe)("merged search filters", () => {
    const rows = [
        {
            vendor_account_name: "Acme Corp",
            partner_account_name: "Zenith Co",
            vendor_owner: "Jane Doe",
            partner_owner: "John Doe",
            match_type: "name",
            match_score: "94",
            match_reasons: "normalized",
            decision_status: "confirmed",
            normalized_name: "acme corp",
        },
        {
            vendor_account_name: "Globex",
            partner_account_name: "",
            vendor_owner: "Sam Smith",
            partner_owner: "",
            match_type: "",
            match_score: "",
            match_reasons: "",
            decision_status: "unmatched",
            normalized_name: "globex",
        },
    ];
    (0, node_test_1.it)("filters by global search across fields", () => {
        const filtered = (0, mergedSearch_1.filterMergedSearchRows)(rows, {
            search: "zenith",
            vendorOwner: "",
            partnerOwner: "",
            matchType: "",
            overlapOnly: false,
            statusRule: "any",
        });
        assert.equal(filtered.length, 1);
        assert.equal(filtered[0].vendor_account_name, "Acme Corp");
    });
    (0, node_test_1.it)("respects overlapOnly by removing unmatched rows", () => {
        const filtered = (0, mergedSearch_1.filterMergedSearchRows)(rows, {
            search: "",
            vendorOwner: "",
            partnerOwner: "",
            matchType: "",
            overlapOnly: true,
            statusRule: "any",
        });
        assert.equal(filtered.length, 1);
        assert.equal(filtered[0].vendor_account_name, "Acme Corp");
    });
});
