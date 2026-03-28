"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const sourceDetection_1 = require("./sourceDetection");
(0, node_test_1.describe)("source URL detection", () => {
    (0, node_test_1.it)("detects greenhouse URLs", () => {
        assert.deepEqual((0, sourceDetection_1.detectSourceFromUrl)("https://boards.greenhouse.io/acme"), {
            boardType: "greenhouse",
            boardToken: "acme",
            company: "Acme",
        });
    });
    (0, node_test_1.it)("detects lever URLs", () => {
        assert.deepEqual((0, sourceDetection_1.detectSourceFromUrl)("https://jobs.lever.co/stripe/1a2b3c"), {
            boardType: "lever",
            boardToken: "stripe",
            company: "Stripe",
        });
    });
    (0, node_test_1.it)("detects ashby URLs", () => {
        assert.deepEqual((0, sourceDetection_1.detectSourceFromUrl)("https://jobs.ashbyhq.com/notion"), {
            boardType: "ashby",
            boardToken: "notion",
            company: "Notion",
        });
    });
    (0, node_test_1.it)("detects smartrecruiters URLs", () => {
        assert.deepEqual((0, sourceDetection_1.detectSourceFromUrl)("https://jobs.smartrecruiters.com/Datadog"), {
            boardType: "smartrecruiters",
            boardToken: "Datadog",
            company: "Datadog",
        });
    });
    (0, node_test_1.it)("returns null for unsupported URLs", () => {
        assert.equal((0, sourceDetection_1.detectSourceFromUrl)("https://example.com/jobs"), null);
    });
});
