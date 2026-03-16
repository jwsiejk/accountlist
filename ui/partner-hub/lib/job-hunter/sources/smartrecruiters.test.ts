import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchSmartRecruitersJobs } from "./smartrecruiters";

describe("fetchSmartRecruitersJobs", () => {
  it("extracts postings and details content", async () => {
    const previousFetch = globalThis.fetch;

    globalThis.fetch = (async (input: URL | RequestInfo) => {
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
        } as Response;
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
      } as Response;
    }) as typeof fetch;

    const jobs = await fetchSmartRecruitersJobs({ company: "Acme", boardToken: "Acme", boardType: "smartrecruiters" });

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].sourceProvider, "smartrecruiters");
    assert.equal(jobs[0].salaryRange, "$180,000 - $220,000 / year");
    assert.equal(jobs[0].employmentType, "FULL_TIME");
    assert.equal(jobs[0].location, "Austin, TX, US");
    assert.equal(jobs[0].notes, "Job Description: Build partner integrations. Qualifications: 10+ years distributed systems.");

    globalThis.fetch = previousFetch;
  });
});
