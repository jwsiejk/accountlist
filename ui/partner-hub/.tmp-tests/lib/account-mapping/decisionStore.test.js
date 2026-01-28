"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const decisionStore_1 = require("./decisionStore");
(0, node_test_1.describe)("decision store", () => {
    (0, node_test_1.it)("serializes and deserializes decisions", () => {
        const decisions = [
            {
                key: (0, decisionStore_1.buildDecisionKey)("vendor-1", "partner-1", "acme"),
                vendorAccountKey: "vendor-1",
                partnerAccountKey: "partner-1",
                normalizedName: "acme",
                decision: "confirmed",
                updatedAt: "2024-02-01T12:00:00.000Z",
            },
        ];
        const serialized = (0, decisionStore_1.serializeDecisions)(decisions);
        const parsed = (0, decisionStore_1.deserializeDecisions)(serialized);
        assert.deepEqual(parsed, decisions);
    });
    (0, node_test_1.it)("applies the latest decision to rows", () => {
        const rows = [
            {
                vendorAccountKey: "vendor-1",
                normalizedName: "acme",
                partnerAccountKey: "partner-1",
                status: "review",
            },
        ];
        const decisions = [
            {
                key: (0, decisionStore_1.buildDecisionKey)("vendor-1", "partner-1", "acme"),
                vendorAccountKey: "vendor-1",
                partnerAccountKey: "partner-1",
                normalizedName: "acme",
                decision: "rejected",
                updatedAt: "2024-02-01T12:00:00.000Z",
            },
            {
                key: (0, decisionStore_1.buildDecisionKey)("vendor-1", "partner-2", "acme"),
                vendorAccountKey: "vendor-1",
                partnerAccountKey: "partner-2",
                normalizedName: "acme",
                decision: "manual",
                updatedAt: "2024-02-02T12:00:00.000Z",
            },
        ];
        const updated = (0, decisionStore_1.applyDecisionsToRows)(rows, decisions);
        assert.equal(updated[0].status, "manual");
        assert.equal(updated[0].partnerAccountKey, "partner-2");
    });
});
