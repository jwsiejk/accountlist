import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchAshbyJobs } from "./ashby";

describe("fetchAshbyJobs", () => {
  it("extracts salary, notes, and employment metadata", async () => {
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
    })) as unknown as typeof fetch;

    const jobs = await fetchAshbyJobs({ company: "Acme", boardToken: "acme", boardType: "ashby" });

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].sourceProvider, "ashby");
    assert.equal(jobs[0].salaryRange, "$175,000 - $210,000 / year");
    assert.equal(jobs[0].employmentType, "Full-time");
    assert.equal(jobs[0].notes, "Help customers adopt cloud architecture. Employment type: Full-time");

    globalThis.fetch = previousFetch;
  });
});
