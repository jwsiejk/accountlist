"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const inference_1 = require("./inference");
const headers = [
    "Account Name",
    "Owner",
    "Manager",
    "Status",
    "Segment",
    "City",
    "State",
    "Country",
    "Contact Email",
    "CRM Account ID",
];
(0, node_test_1.describe)("inferMappingFromHeaders", () => {
    (0, node_test_1.it)("maps common headers to canonical fields", () => {
        const mapping = (0, inference_1.inferMappingFromHeaders)(headers);
        assert.equal(mapping.account_name, "Account Name");
        assert.equal(mapping.owner_name, "Owner");
        assert.equal(mapping.manager_name, "Manager");
        assert.equal(mapping.status, "Status");
        assert.equal(mapping.segment_type, "Segment");
        assert.equal(mapping.city, "City");
        assert.equal(mapping.state, "State");
        assert.equal(mapping.country, "Country");
        assert.equal(mapping.contacts, "Contact Email");
        assert.equal(mapping.crm_account_id, "CRM Account ID");
    });
    (0, node_test_1.it)("avoids mapping unknown headers", () => {
        const mapping = (0, inference_1.inferMappingFromHeaders)(["Foo", "Bar"]);
        assert.equal(mapping.account_name, "");
        assert.equal(mapping.owner_name, "");
    });
});
