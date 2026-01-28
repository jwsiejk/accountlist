"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const schema_1 = require("./schema");
(0, node_test_1.describe)("account mapping schema", () => {
    (0, node_test_1.it)("requires account_name mapping", () => {
        const mapping = (0, schema_1.createEmptyRawMapping)();
        mapping.owner_name = "Owner";
        const result = (0, schema_1.validateMapping)(mapping);
        assert.equal(result.success, false);
    });
    (0, node_test_1.it)("accepts optional fields when account_name is mapped", () => {
        const mapping = (0, schema_1.createEmptyRawMapping)();
        mapping.account_name = "Account Name";
        mapping.crm_account_id = "CRM ID";
        const result = (0, schema_1.validateMapping)(mapping);
        assert.equal(result.success, true);
        if (result.success) {
            assert.deepEqual(result.data, {
                ...(0, schema_1.normalizeMapping)(mapping),
                account_name: "Account Name",
            });
        }
    });
});
