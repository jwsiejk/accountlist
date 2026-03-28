"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const greenhouse_1 = require("./greenhouse");
(0, node_test_1.describe)("fetchGreenhouseJobs", () => {
    (0, node_test_1.it)("extracts rich notes, salary, and employment metadata", async () => {
        const previousFetch = globalThis.fetch;
        globalThis.fetch = (async () => ({
            ok: true,
            json: async () => ({
                jobs: [
                    {
                        id: 101,
                        title: "Senior Solutions Architect",
                        absolute_url: "https://boards.greenhouse.io/acme/jobs/101",
                        content: "<p>Apply now</p><p>Lead partner workshops &amp; infrastructure design.</p><p>Lead partner workshops &amp; infrastructure design.</p><p>All qualified applicants will receive consideration for employment.</p>",
                        location: { name: "Remote - US" },
                        departments: [{ name: "Post-sales" }],
                        metadata: [
                            { name: "Compensation", value: "$180,000 - $210,000 / year" },
                            { name: "Employment Type", value: "Full-time" },
                        ],
                        updated_at: "2024-01-05T00:00:00.000Z",
                    },
                ],
            }),
        }));
        const jobs = await (0, greenhouse_1.fetchGreenhouseJobs)({ company: "Acme", boardToken: "acme", boardType: "greenhouse" });
        assert.equal(jobs.length, 1);
        assert.equal(jobs[0].sourceProvider, "greenhouse");
        assert.equal(jobs[0].salaryRange, "$180,000 - $210,000 / year");
        assert.equal(jobs[0].employmentType, "Full-time");
        assert.equal(jobs[0].notes, "Lead partner workshops & infrastructure design. Employment type: Full-time");
        globalThis.fetch = previousFetch;
    });
});
