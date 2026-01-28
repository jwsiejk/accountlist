"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const mergedSearchDataset_1 = require("./mergedSearchDataset");
(0, node_test_1.describe)("merged search dataset selection", () => {
    (0, node_test_1.it)("defaults to upload when run dataset is missing but upload exists", () => {
        const selection = (0, mergedSearchDataset_1.resolveMergedSearchDataset)("run", {
            hasRunDataset: false,
            hasUploadedDataset: true,
        });
        assert.equal(selection, "upload");
    });
    (0, node_test_1.it)("keeps the upload selection even when no upload dataset exists", () => {
        const selection = (0, mergedSearchDataset_1.resolveMergedSearchDataset)("upload", {
            hasRunDataset: true,
            hasUploadedDataset: false,
        });
        assert.equal(selection, "upload");
    });
    (0, node_test_1.it)("keeps the run selection when run data exists", () => {
        const selection = (0, mergedSearchDataset_1.resolveMergedSearchDataset)("run", {
            hasRunDataset: true,
            hasUploadedDataset: true,
        });
        assert.equal(selection, "run");
    });
});
