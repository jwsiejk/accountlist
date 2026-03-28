"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const sourceTesting_1 = require("./sourceTesting");
const previousFetch = globalThis.fetch;
(0, node_test_1.afterEach)(() => {
    globalThis.fetch = previousFetch;
});
(0, node_test_1.describe)("job hunter source testing", () => {
    (0, node_test_1.it)("returns success diagnostic with fetched count", async () => {
        globalThis.fetch = (async () => {
            return {
                ok: true,
                json: async () => ({ jobs: [{ id: 1, title: "Engineer", absolute_url: "https://x/job/1" }] }),
            };
        });
        const result = await (0, sourceTesting_1.testJobSource)({ company: "Acme", boardType: "greenhouse", boardToken: "acme" });
        assert.equal(result.success, true);
        assert.equal(result.jobsFetched, 1);
        assert.equal(result.provider, "greenhouse");
        assert.equal(result.token, "acme");
    });
    (0, node_test_1.it)("returns failure diagnostic when provider fetch throws", async () => {
        globalThis.fetch = (async () => {
            throw new Error("bad token");
        });
        const result = await (0, sourceTesting_1.testJobSource)({ company: "Acme", boardType: "lever", boardToken: "bad" });
        assert.equal(result.success, false);
        assert.equal(result.jobsFetched, 0);
        assert.match(result.error ?? "", /bad token/i);
    });
});
