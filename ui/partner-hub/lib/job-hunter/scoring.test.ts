import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { getDefaultPreferences } from "./preferences";
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
  });

  it("supports remote US and hybrid Philly preference boosts", () => {
    const preferences = getDefaultPreferences();
    const remoteResult = scoreJobFit({ ...baseJob, location: "Remote - United States", notes: "remote" }, preferences);
    const hybridResult = scoreJobFit({ ...baseJob, location: "Philadelphia, PA", notes: "hybrid schedule" }, preferences);

    assert.ok(remoteResult.preferenceSignals.some((signal) => signal.includes("Matched remote region")));
    assert.ok(hybridResult.preferenceSignals.some((signal) => signal.includes("Matched hybrid location")));
  });

  it("penalizes unknown arrangement so it is not over-promoted", () => {
    const known = scoreJobFit({ ...baseJob, notes: "Remote role" }, getDefaultPreferences());
    const unknown = scoreJobFit({ ...baseJob, location: "Pennsylvania", notes: "Some travel" }, getDefaultPreferences());

    assert.ok(unknown.preferenceSignals.includes("Work arrangement unknown"));
    assert.ok(unknown.score < known.score);
  });

  it("zeros score for excluded company and title", () => {
    assert.equal(scoreJobFit(baseJob, { ...getDefaultPreferences(), excludedCompanies: ["acme"] }).score, 0);
    assert.equal(scoreJobFit(baseJob, { ...getDefaultPreferences(), excludedTitles: ["architect"] }).score, 0);
  });
});
