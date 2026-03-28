"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const smartrecruiters_1 = require("./smartrecruiters");
(0, node_test_1.describe)("fetchSmartRecruitersJobs", () => {
    (0, node_test_1.it)("extracts postings and details content", async () => {
        const previousFetch = globalThis.fetch;
        globalThis.fetch = (async (input) => {
            const url = String(input);
            if (url.includes("/postings?")) {
                return {
                    ok: true,
                    json: async () => ({
                        content: [
                            {
                                id: "sr-1",
                                name: "Senior Partner Engineer",
                                releasedDate: "2024-01-03T00:00:00.000Z",
                                typeOfEmployment: "FULL_TIME",
                                location: { city: "Austin", region: "TX", country: "US" },
                                department: { label: "Engineering" },
                            },
                        ],
                    }),
                };
            }
            return {
                ok: true,
                json: async () => ({
                    compensation: { description: "$180,000 - $220,000 / year" },
                    jobAd: {
                        sections: [
                            { title: "Job Description", text: "Build partner integrations." },
                            { title: "Qualifications", text: "10+ years distributed systems." },
                        ],
                    },
                }),
            };
        });
        const jobs = await (0, smartrecruiters_1.fetchSmartRecruitersJobs)({ company: "Acme", boardToken: "Acme", boardType: "smartrecruiters" });
        assert.equal(jobs.length, 1);
        assert.equal(jobs[0].sourceProvider, "smartrecruiters");
        assert.equal(jobs[0].salaryRange, "$180,000 - $220,000 / year");
        assert.equal(jobs[0].employmentType, "FULL_TIME");
        assert.equal(jobs[0].location, "Austin, TX, US");
        assert.equal(jobs[0].notes, "Job Description: Build partner integrations. Qualifications: 10+ years distributed systems.");
        globalThis.fetch = previousFetch;
    });
});
