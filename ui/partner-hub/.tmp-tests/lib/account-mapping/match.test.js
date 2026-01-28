"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const match_1 = require("./match");
(0, node_test_1.describe)("matchAccounts", () => {
    (0, node_test_1.it)("detects exact matches by normalized name", () => {
        const results = (0, match_1.matchAccounts)([{ id: "a1", name: "Acme, Inc." }], [{ id: "b1", name: "Acme" }]);
        assert.equal(results[0].best?.matchType, "exact");
        assert.equal(results[0].best?.score, 100);
        assert.deepEqual(results[0].best?.reasons, ["same normalized name"]);
        assert.equal(results[0].status, "autoMatch");
    });
    (0, node_test_1.it)("scores strong and weak candidates within the same block", () => {
        const results = (0, match_1.matchAccounts)([
            { id: "a1", name: "Wayne Enterprises" },
            { id: "a2", name: "Contoso Labs International" },
        ], [
            { id: "b1", name: "Wayne Enterprise" },
            { id: "b2", name: "Contoso Labs" },
        ]);
        assert.equal(results[0].best?.matchType, "strong");
        assert.equal(results[0].status, "autoMatch");
        assert.equal(results[1].best?.matchType, "exact");
        assert.equal(results[1].status, "autoMatch");
    });
    (0, node_test_1.it)("marks unmatched when scores fall below the review threshold", () => {
        const results = (0, match_1.matchAccounts)([{ id: "a1", name: "Nonexistent Company" }], [{ id: "b1", name: "Different Brand" }]);
        assert.equal(results[0].best, null);
        assert.equal(results[0].status, "unmatched");
    });
});
