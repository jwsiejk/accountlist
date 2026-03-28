"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const lever_1 = require("./lever");
(0, node_test_1.describe)("fetchLeverJobs", () => {
    (0, node_test_1.it)("extracts notes, workplace signals, and compensation", async () => {
        const previousFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            ok: true,
            json: async () => [
                {
                    id: "abc",
                    text: "Partner Solutions Architect",
                    hostedUrl: "https://jobs.lever.co/acme/abc",
                    description: "<p>Drive partner architecture reviews and post-sales workshops.</p><p>Apply now</p><p>Drive partner architecture reviews and post-sales workshops.</p>",
                    additional: "<p>Compensation: $150,000 - $190,000 / year</p><p>Equal Opportunity Employer</p>",
                    commitment: "Full-time",
                    categories: {
                        location: "Remote",
                        team: "Solutions",
                        workplaceType: "Remote",
                    },
                    createdAt: 1704412800000,
                },
            ],
        }));
        const jobs = await (0, lever_1.fetchLeverJobs)({ company: "Acme", boardToken: "acme", boardType: "lever" });
        assert.equal(jobs.length, 1);
        assert.equal(jobs[0].sourceProvider, "lever");
        assert.equal(jobs[0].employmentType, "Full-time");
        assert.equal(jobs[0].salaryRange, "$150,000 - $190,000 / year");
        assert.equal(jobs[0].notes, "Drive partner architecture reviews and post-sales workshops. Compensation: $150,000 - $190,000 / year Workplace: Remote Commitment: Full-time");
        globalThis.fetch = previousFetch;
    });
});
