import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDefaultPreferences, jobMatchesPreferences, normalizePreferences } from "./preferences";
import type { JobPosting } from "./types";

const baseJob: JobPosting = {
  id: "job-1",
  title: "Partner Solutions Architect",
  company: "Contoso",
  source: "manual",
  location: "Remote - US",
  isRemote: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("preferences", () => {
  it("returns defaults", () => {
    assert.deepEqual(getDefaultPreferences(), {
      targetRoles: [],
      targetKeywords: [],
      targetLocations: [],
      remoteOnly: false,
      excludedCompanies: [],
      excludedTitles: [],
      minimumScore: 0,
    });
  });

  it("normalizes mixed input values", () => {
    const result = normalizePreferences({
      targetRoles: ["  architect  ", "", "   "],
      targetKeywords: [" partner", 12 as never],
      targetLocations: undefined,
      remoteOnly: 1 as never,
      excludedCompanies: ["  Acme "],
      excludedTitles: [" Manager "],
      minimumScore: 120,
    });

    assert.deepEqual(result, {
      targetRoles: ["architect"],
      targetKeywords: ["partner"],
      targetLocations: [],
      remoteOnly: true,
      excludedCompanies: ["Acme"],
      excludedTitles: ["Manager"],
      minimumScore: 100,
    });
  });

  it("cleans blank lines and clamps minimum score", () => {
    const result = normalizePreferences({
      targetRoles: ["\n", "  ", "Engineer"],
      minimumScore: -10,
    });

    assert.deepEqual(result.targetRoles, ["Engineer"]);
    assert.equal(result.minimumScore, 0);
  });

  it("marks jobs as excluded when company/title/remote criteria match", () => {
    const matches = jobMatchesPreferences(baseJob, {
      ...getDefaultPreferences(),
      excludedCompanies: ["contoso"],
      excludedTitles: ["architect"],
      remoteOnly: true,
    });

    assert.equal(matches.excluded, true);
    assert.ok(matches.reasons.includes("Excluded company"));
    assert.ok(matches.reasons.includes("Excluded title"));
  });

  it("adds remote exclusion reason for non-remote jobs", () => {
    const matches = jobMatchesPreferences({ ...baseJob, isRemote: false }, { ...getDefaultPreferences(), remoteOnly: true });

    assert.equal(matches.excluded, true);
    assert.deepEqual(matches.reasons, ["Remote-only preference"]);
  });
});
