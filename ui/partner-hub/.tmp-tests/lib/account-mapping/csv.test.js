"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const csv_1 = require("./csv");
(0, node_test_1.describe)("account mapping csv helpers", () => {
    (0, node_test_1.it)("escapes commas, quotes, and newlines", () => {
        assert.equal((0, csv_1.escapeCsvValue)("Simple"), "Simple");
        assert.equal((0, csv_1.escapeCsvValue)("Hello, world"), '"Hello, world"');
        assert.equal((0, csv_1.escapeCsvValue)('He said "hi"'), '"He said ""hi"""');
        assert.equal((0, csv_1.escapeCsvValue)("Line1\nLine2"), '"Line1\nLine2"');
    });
    (0, node_test_1.it)("builds a csv with headers and escaped values", () => {
        const csv = (0, csv_1.buildCsv)(["name", "note"], [["ACME", "Hello, world"]]);
        assert.equal(csv, 'name,note\nACME,"Hello, world"');
    });
});
