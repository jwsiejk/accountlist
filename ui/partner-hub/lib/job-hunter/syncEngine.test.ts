import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { __private__, runJobSync } from "./syncEngine";

describe("job hunter sync engine", () => {
  it("runs board adapters and syncs jobs", async () => {
    const previousFetch = globalThis.fetch;

    const called: string[] = [];
    globalThis.fetch = (async (input: URL | RequestInfo) => {
      const url = String(input);
      called.push(url);

      if (url.includes("boards-api.greenhouse.io")) {
        return {
          ok: true,
          json: async () => ({
            jobs: [{ id: 10, title: " Engineer ", absolute_url: "https://gh/job/10", location: { name: " Remote " } }],
          }),
        } as Response;
      }

      if (url.includes("api.lever.co")) {
        return {
          ok: true,
          json: async () => [{ id: "abc", text: " PM ", hostedUrl: "https://lever/job/abc", categories: { location: "NYC" } }],
        } as Response;
      }

      if (url.includes("jobs.ashbyhq.com")) {
        return {
          ok: true,
          json: async () => ({ jobs: [{ id: "ash1", title: " Architect ", jobUrl: "https://jobs.ashbyhq.com/acme/ash1" }] }),
        } as Response;
      }

      if (url.includes("api.smartrecruiters.com") && url.includes("/postings?")) {
        return {
          ok: true,
          json: async () => ({ content: [{ id: "sr1", name: "Engineer" }] }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ jobAd: { sections: [] } }),
      } as Response;
    }) as typeof fetch;

    const jobs = await runJobSync([
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
    assert.equal(jobs.length, 4);

    globalThis.fetch = previousFetch;
  });

  it("normalizes jobs and deduplicates by stable id", () => {
    const normalized = __private__.normalizeJobs([
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
