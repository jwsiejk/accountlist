"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const syncEngine_1 = require("./syncEngine");
const previousFetch = globalThis.fetch;
(0, node_test_1.afterEach)(() => {
    globalThis.fetch = previousFetch;
});
(0, node_test_1.describe)("job hunter sync engine", () => {
    (0, node_test_1.it)("runs board adapters and syncs jobs with diagnostics", async () => {
        const called = [];
        globalThis.fetch = (async (input) => {
            const url = String(input);
            called.push(url);
            if (url.includes("boards-api.greenhouse.io")) {
                return {
                    ok: true,
                    json: async () => ({
                        jobs: [{ id: 10, title: " Engineer ", absolute_url: "https://gh/job/10", location: { name: " Remote " } }],
                    }),
                };
            }
            if (url.includes("api.lever.co")) {
                return {
                    ok: true,
                    json: async () => [{ id: "abc", text: " PM ", hostedUrl: "https://lever/job/abc", categories: { location: "NYC" } }],
                };
            }
            if (url.includes("jobs.ashbyhq.com")) {
                return {
                    ok: true,
                    json: async () => ({ jobs: [{ id: "ash1", title: " Architect ", jobUrl: "https://jobs.ashbyhq.com/acme/ash1" }] }),
                };
            }
            if (url.includes("api.smartrecruiters.com") && url.includes("/postings?")) {
                return {
                    ok: true,
                    json: async () => ({ content: [{ id: "sr1", name: "Engineer" }] }),
                };
            }
            return {
                ok: true,
                json: async () => ({ jobAd: { sections: [] } }),
            };
        });
        const result = await (0, syncEngine_1.runJobSync)([
            { company: "Acme", boardType: "greenhouse", boardToken: "acme-gh" },
            { company: "Acme", boardType: "lever", boardToken: "acme-lever" },
            { company: "Acme", boardType: "ashby", boardToken: "acme-ashby" },
            { company: "Acme", boardType: "smartrecruiters", boardToken: "Acme" },
        ]);
        assert.equal(called.length, 5);
        assert.ok(called.some((url) => url.includes("boards-api.greenhouse.io/v1/boards/acme-gh/jobs")));
        assert.ok(called.some((url) => url.includes("api.lever.co/v0/postings/acme-lever")));
        assert.ok(called.some((url) => url.includes("jobs.ashbyhq.com/api/non-user-portal/job-board")));
        assert.ok(called.some((url) => url.includes("api.smartrecruiters.com/v1/companies/Acme/postings?limit=100")));
        assert.equal(result.jobs.length, 4);
        assert.equal(result.diagnostics.length, 4);
        assert.ok(result.diagnostics.every((item) => item.success));
    });
    (0, node_test_1.it)("isolates source failures so one provider does not fail the whole sync", async () => {
        globalThis.fetch = (async (input) => {
            const url = String(input);
            if (url.includes("boards-api.greenhouse.io")) {
                throw new Error("network exploded");
            }
            if (url.includes("api.lever.co")) {
                return {
                    ok: true,
                    json: async () => [{ id: "abc", text: "PM", hostedUrl: "https://lever/job/abc" }],
                };
            }
            return {
                ok: true,
                json: async () => ({ content: [], jobAd: { sections: [] } }),
            };
        });
        const result = await (0, syncEngine_1.runJobSync)([
            { company: "Acme", boardType: "greenhouse", boardToken: "acme-gh" },
            { company: "Acme", boardType: "lever", boardToken: "acme-lever" },
        ]);
        assert.equal(result.jobs.length, 1);
        assert.equal(result.diagnostics.length, 2);
        const greenhouse = result.diagnostics.find((item) => item.provider === "greenhouse");
        const lever = result.diagnostics.find((item) => item.provider === "lever");
        assert.equal(greenhouse?.success, false);
        assert.match(greenhouse?.error ?? "", /network exploded/i);
        assert.equal(lever?.success, true);
        assert.equal(lever?.jobsFetched, 1);
    });
    (0, node_test_1.it)("returns failure diagnostics when all sources fail", async () => {
        globalThis.fetch = (async () => {
            throw new Error("provider unavailable");
        });
        const result = await (0, syncEngine_1.runJobSync)([
            { company: "Acme", boardType: "greenhouse", boardToken: "acme-gh" },
            { company: "Acme", boardType: "lever", boardToken: "acme-lever" },
        ]);
        assert.equal(result.jobs.length, 0);
        assert.equal(result.diagnostics.length, 2);
        assert.ok(result.diagnostics.every((item) => !item.success));
    });
    (0, node_test_1.it)("normalizes jobs and deduplicates by stable id", () => {
        const normalized = syncEngine_1.__private__.normalizeJobs([
            {
                id: "lever:abc",
                externalId: "abc",
                company: " Acme ",
                title: " Product   Manager ",
                location: "Remote - US",
                source: "company-site",
                sourceUrl: "https://lever/job/abc",
                salaryRange: "$100k-$120k",
                notes: "Older notes",
                postedAt: "2024-01-01T00:00:00.000Z",
                createdAt: "2024-01-01T00:00:00.000Z",
                updatedAt: "2024-01-01T00:00:00.000Z",
            },
            {
                id: "lever:abc",
                externalId: "abc",
                company: "Acme",
                title: "Product Manager",
                location: "Remote",
                source: "company-site",
                sourceUrl: "https://lever/job/abc",
                salaryRange: "$120k-$140k",
                employmentType: "Full-time",
                notes: "Newer detailed notes",
                postedAt: "2024-01-02T00:00:00.000Z",
                createdAt: "2024-01-02T00:00:00.000Z",
                updatedAt: "2024-01-02T00:00:00.000Z",
            },
        ]);
        assert.equal(normalized.length, 1);
        assert.equal(normalized[0].id, "lever:abc");
        assert.equal(normalized[0].company, "Acme");
        assert.equal(normalized[0].title, "Product Manager");
        assert.equal(normalized[0].location, "Remote");
        assert.equal(normalized[0].postedAt, "2024-01-02T00:00:00.000Z");
        assert.equal(normalized[0].salaryRange, "$120k-$140k");
        assert.equal(normalized[0].employmentType, "Full-time");
        assert.equal(normalized[0].notes, "Newer detailed notes");
    });
});
