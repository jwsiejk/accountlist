"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const comboboxUtils_1 = require("./comboboxUtils");
(0, node_test_1.describe)("Combobox utils", () => {
    (0, node_test_1.it)("renders labels with counts", () => {
        assert.equal((0, comboboxUtils_1.formatComboboxOptionLabel)({ value: "East", count: 12 }), "East (12)");
        assert.equal((0, comboboxUtils_1.formatComboboxOptionLabel)({ value: "Jordan", label: "Jordan Lee", count: 18 }), "Jordan Lee (18)");
        assert.equal((0, comboboxUtils_1.formatComboboxOptionLabel)({ value: "West" }), "West");
    });
});
