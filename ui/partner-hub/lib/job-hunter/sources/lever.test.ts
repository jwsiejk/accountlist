import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchLeverJobs } from "./lever";

describe("fetchLeverJobs", () => {
  it("extracts notes, workplace signals, and compensation", async () => {
    const previousFetch = globalThis.fetch;

    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => [
        {
          id: "abc",
          text: "Partner Solutions Architect",
          hostedUrl: "https://jobs.lever.co/acme/abc",
          description: "<p>Drive partner architecture reviews and post-sales workshops.</p>",
          additional: "<p>Compensation: $150,000 - $190,000 / year</p>",
          commitment: "Full-time",
          categories: {
            location: "Remote",
            team: "Solutions",
            workplaceType: "Remote",
          },
          createdAt: 1704412800000,
        },
      ],
    })) as unknown as typeof fetch;

    const jobs = await fetchLeverJobs({ company: "Acme", boardToken: "acme", boardType: "lever" });

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].sourceProvider, "lever");
    assert.equal(jobs[0].employmentType, "Full-time");
    assert.equal(jobs[0].salaryRange, "$150,000 - $190,000 / year");
    assert.ok(jobs[0].notes?.includes("Drive partner architecture reviews and post-sales workshops."));
    assert.ok(jobs[0].notes?.includes("Workplace: Remote"));

    globalThis.fetch = previousFetch;
  });
});
