import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { scoreJobFit } from "./scoring";
import type { JobHunterPreferences, JobPosting } from "./types";

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

const basePreferences: JobHunterPreferences = {
  targetRoles: [],
  targetKeywords: [],
  targetLocations: [],
  remoteOnly: false,
  excludedCompanies: [],
  excludedTitles: [],
  minimumScore: 0,
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

  it("boosts score for target role matches", () => {
    const result = scoreJobFit(baseJob, { ...basePreferences, targetRoles: ["solutions architect"] });

    assert.ok(result.preferenceSignals.includes("Matched target role: solutions architect"));
    assert.ok(result.score > scoreJobFit(baseJob).score);
  });

  it("boosts score for target keyword matches", () => {
    const result = scoreJobFit(baseJob, { ...basePreferences, targetKeywords: ["partner"] });

    assert.ok(result.preferenceSignals.includes("Matched target keyword: partner"));
  });

  it("boosts score for preferred location matches", () => {
    const result = scoreJobFit(baseJob, { ...basePreferences, targetLocations: ["remote"] });

    assert.ok(result.preferenceSignals.includes("Matched preferred location: remote"));
  });

  it("applies remote-only bonus and penalty", () => {
    const remoteResult = scoreJobFit({ ...baseJob, isRemote: true }, { ...basePreferences, remoteOnly: true });
    const onSiteResult = scoreJobFit({ ...baseJob, isRemote: false }, { ...basePreferences, remoteOnly: true });

    assert.ok(remoteResult.preferenceSignals.includes("Matched remote-only preference"));
    assert.ok(onSiteResult.preferenceSignals.includes("Remote-only preference unmet"));
    assert.ok(onSiteResult.score < remoteResult.score);
  });

  it("zeros score for excluded company", () => {
    const result = scoreJobFit(baseJob, { ...basePreferences, excludedCompanies: ["acme"] });

    assert.equal(result.score, 0);
    assert.ok(result.preferenceSignals.includes("Excluded company match"));
  });

  it("zeros score for excluded title", () => {
    const result = scoreJobFit(baseJob, { ...basePreferences, excludedTitles: ["architect"] });

    assert.equal(result.score, 0);
    assert.ok(result.preferenceSignals.includes("Excluded title match"));
  });
});
