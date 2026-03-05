import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { scoreJobFit } from "./scoring";
import type { JobPosting } from "./types";

const baseJob: JobPosting = {
  id: "greenhouse:1",
  title: "Senior Solutions Architect, Partner Infrastructure",
  company: "Acme",
  location: "Remote",
  department: "Post-sales",
  source: "company-site",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("scoreJobFit", () => {
  it("returns a higher score for strong keyword coverage", () => {
    const result = scoreJobFit({ ...baseJob, notes: "Cloud storage infra partner workshops" });

    assert.ok(result.score >= 70);
    assert.ok(result.matched.length > 0);
    assert.ok(result.missing.length > 0);
  });

  it("returns low scores when little overlap exists", () => {
    const result = scoreJobFit({ ...baseJob, title: "Office Administrator", department: "HR", notes: "Payroll and scheduling" });

    assert.ok(result.score < 35);
    assert.ok(result.matched.some((item) => item.keyword === "partner") === false);
  });
});
