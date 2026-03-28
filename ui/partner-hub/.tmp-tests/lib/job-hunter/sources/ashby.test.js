"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const ashby_1 = require("./ashby");
(0, node_test_1.describe)("fetchAshbyJobs", () => {
    (0, node_test_1.it)("extracts salary, notes, and employment metadata", async () => {
        const previousFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            ok: true,
            json: async () => ({
                jobs: [
                    {
                        id: "ash-1",
                        title: "Solutions Architect",
                        jobUrl: "https://jobs.ashbyhq.com/acme/ash-1",
                        locationName: "Remote - US",
                        departmentName: "Solutions",
                        employmentType: "Full-time",
                        descriptionPlain: "Help customers adopt cloud architecture.",
                        compensation: { compensationTierSummary: "$175,000 - $210,000 / year" },
                        postedDate: "2024-01-10T00:00:00.000Z",
                    },
                ],
            }),
        }));
        const jobs = await (0, ashby_1.fetchAshbyJobs)({ company: "Acme", boardToken: "acme", boardType: "ashby" });
        assert.equal(jobs.length, 1);
        assert.equal(jobs[0].sourceProvider, "ashby");
        assert.equal(jobs[0].salaryRange, "$175,000 - $210,000 / year");
        assert.equal(jobs[0].employmentType, "Full-time");
        assert.equal(jobs[0].notes, "Help customers adopt cloud architecture. Employment type: Full-time");
        globalThis.fetch = previousFetch;
    });
});
