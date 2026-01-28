"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const exportSchema_1 = require("./exportSchema");
(0, node_test_1.describe)("account mapping export schema", () => {
    (0, node_test_1.it)("validates merged account export rows", () => {
        const row = {
            vendor_account_name: "Acme Corp",
            partner_account_name: "Acme Ltd",
            vendor_owner: "Sam",
            vendor_manager: "Taylor",
            vendor_pam: "Riley",
            partner_owner: "Jordan",
            partner_manager: "Casey",
            partner_pam: "Morgan",
            vendor_status: "Customer",
            partner_status: "Prospect",
            match_score: "0.92",
            match_type: "exact",
            match_reasons: "normalized name",
        };
        assert.deepEqual(exportSchema_1.mergedAccountExportSchema.parse(row), row);
    });
    (0, node_test_1.it)("validates target list export rows", () => {
        const row = {
            vendor_account_name: "Globex",
            partner_account_name: "Globex Partner",
            vendor_status: "Prospect",
            partner_status: "Customer",
            match_score: "0.81",
            match_type: "fuzzy",
            match_reasons: "alias",
        };
        assert.deepEqual(exportSchema_1.targetExportSchema.parse(row), row);
    });
});
