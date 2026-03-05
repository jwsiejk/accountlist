import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applicationReducer, createApplicationFromJob, exportApplicationsCsv } from "./applications";
import type { JobPosting } from "./types";

const job: JobPosting = {
  id: "job-1",
  title: "Product Manager",
  company: "Acme",
  source: "company-site",
  sourceUrl: "https://example.com/jobs/1",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("job hunter application reducer", () => {
  it("creates prepared application entries", () => {
    const created = createApplicationFromJob(job, "2024-03-01T10:00:00.000Z");

    assert.equal(created.status, "prepared");
    assert.equal(created.jobId, job.id);
  });

  it("updates status timestamps", () => {
    const initial = {
      [job.id]: createApplicationFromJob(job, "2024-03-01T10:00:00.000Z"),
    };

    const applied = applicationReducer(initial, {
      type: "setStatus",
      jobId: job.id,
      status: "applied",
      now: "2024-03-02T10:00:00.000Z",
    });

    assert.equal(applied[job.id].appliedAt, "2024-03-02T10:00:00.000Z");
    assert.equal(applied[job.id].status, "applied");
  });

  it("exports applications as csv", () => {
    const applications = [
      {
        ...createApplicationFromJob(job, "2024-03-01T10:00:00.000Z"),
        status: "applied" as const,
      },
    ];

    const csv = exportApplicationsCsv(applications, { [job.id]: job });

    assert.match(csv, /"jobId","company","title"/);
    assert.match(csv, /"job-1","Acme","Product Manager"/);
  });
});
