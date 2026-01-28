"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const normalize_1 = require("./normalize");
(0, node_test_1.describe)("normalizeName", () => {
    (0, node_test_1.it)("normalizes punctuation, casing, and legal suffixes", () => {
        assert.equal((0, normalize_1.normalizeName)("Acme, Inc."), "acme");
        assert.equal((0, normalize_1.normalizeName)("  ACME Holdings, LLC  "), "acme");
        assert.equal((0, normalize_1.normalizeName)("Foo-Bar Co."), "foo bar");
        assert.equal((0, normalize_1.normalizeName)("R&D Group PLC"), "rd");
    });
    (0, node_test_1.it)("collapses whitespace and removes trailing legal suffixes", () => {
        assert.equal((0, normalize_1.normalizeName)("The Example Company Ltd"), "example");
    });
});
(0, node_test_1.describe)("blockingKey", () => {
    (0, node_test_1.it)("combines the first token with a prefix", () => {
        assert.equal((0, normalize_1.blockingKey)("acme widgets"), "acme:acme w");
    });
});
