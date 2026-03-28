"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const sourceTestApi_1 = require("./sourceTestApi");
(0, node_test_1.describe)("source test API semantics", () => {
    (0, node_test_1.it)("returns 200 for successful source tests", () => {
        const status = (0, sourceTestApi_1.getSourceTestStatus)({
            success: true,
            result: {
                sourceId: "greenhouse:acme",
                company: "Acme",
                provider: "greenhouse",
                token: "acme",
                success: true,
                jobsFetched: 2,
            },
        });
        assert.equal(status, 200);
    });
    (0, node_test_1.it)("returns 422 for failed source tests with structured diagnostics", () => {
        const status = (0, sourceTestApi_1.getSourceTestStatus)({
            success: false,
            result: {
                sourceId: "lever:bad",
                company: "Acme",
                provider: "lever",
                token: "bad",
                success: false,
                jobsFetched: 0,
                error: "bad token",
            },
        });
        assert.equal(status, 422);
    });
    (0, node_test_1.it)("returns 400 when payload is invalid", () => {
        const status = (0, sourceTestApi_1.getSourceTestStatus)({
            success: false,
            error: "Invalid source payload.",
        });
        assert.equal(status, 400);
    });
});
