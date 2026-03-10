import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyWorkArrangement,
  getDefaultPreferences,
  JAMES_DEFAULT_HYBRID_LOCATIONS,
  JAMES_DEFAULT_REMOTE_REGIONS,
  JAMES_DEFAULT_TARGET_KEYWORDS,
  JAMES_DEFAULT_TARGET_ROLES,
  jobMatchesPreferences,
  normalizePreferences,
} from "./preferences";
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
  it("returns James defaults", () => {
    const defaults = getDefaultPreferences();
    assert.deepEqual(defaults.targetRoles, JAMES_DEFAULT_TARGET_ROLES);
    assert.deepEqual(defaults.targetKeywords, JAMES_DEFAULT_TARGET_KEYWORDS);
    assert.deepEqual(defaults.preferredHybridLocations, JAMES_DEFAULT_HYBRID_LOCATIONS);
    assert.deepEqual(defaults.preferredRemoteRegions, JAMES_DEFAULT_REMOTE_REGIONS);
    assert.equal(defaults.allowRemoteRoles, true);
    assert.equal(defaults.allowHybridRoles, true);
    assert.equal(defaults.allowOnsiteRoles, false);
  });

  it("migrates legacy remoteOnly payloads", () => {
    const result = normalizePreferences({
      targetRoles: ["  architect  "],
      targetLocations: [" Philadelphia "],
      remoteOnly: true,
    });

    assert.equal(result.allowRemoteRoles, true);
    assert.equal(result.allowHybridRoles, false);
    assert.equal(result.allowOnsiteRoles, false);
    assert.deepEqual(result.preferredHybridLocations, ["Philadelphia"]);
  });

  it("classifies arrangement deterministically", () => {
    assert.equal(classifyWorkArrangement({ ...baseJob, location: "Remote - United States" }), "remote");
    assert.equal(classifyWorkArrangement({ ...baseJob, location: "Philadelphia, PA", notes: "Hybrid role, 2 days in office" }), "hybrid");
    assert.equal(classifyWorkArrangement({ ...baseJob, isRemote: false, location: "New York, NY", notes: "Office-based position" }), "onsite");
    assert.equal(classifyWorkArrangement({ ...baseJob, isRemote: false, location: "Pennsylvania" }), "unknown");
  });

  it("matches hybrid Philly and remote US while excluding onsite by default", () => {
    const preferences = getDefaultPreferences();

    const hybridMatch = jobMatchesPreferences({ ...baseJob, location: "King of Prussia, PA", notes: "Hybrid schedule" }, preferences);
    const remoteMatch = jobMatchesPreferences({ ...baseJob, location: "Remote - United States", notes: "Fully remote" }, preferences);
    const onsiteMatch = jobMatchesPreferences({ ...baseJob, isRemote: false, location: "Philadelphia, PA", notes: "On-site required" }, preferences);

    assert.equal(hybridMatch.excluded, false);
    assert.equal(remoteMatch.excluded, false);
    assert.equal(onsiteMatch.excluded, true);
    assert.ok(onsiteMatch.reasons.includes("Onsite roles disabled"));
  });

  it("matches hybrid Philly and remote US when preference signal exists in notes", () => {
    const hybridPreferences = {
      ...getDefaultPreferences(),
      preferredHybridLocations: ["Philadelphia"],
    };
    const remotePreferences = {
      ...getDefaultPreferences(),
      preferredRemoteRegions: ["United States"],
    };

    const hybridMatch = jobMatchesPreferences(
      {
        ...baseJob,
        location: "Pennsylvania",
        notes: "Hybrid schedule with 2 days/week in our Philadelphia office",
      },
      hybridPreferences,
    );
    const remoteMatch = jobMatchesPreferences(
      {
        ...baseJob,
        location: "Remote",
        notes: "Fully remote role; candidates must be based in the United States",
      },
      remotePreferences,
    );

    assert.equal(hybridMatch.excluded, false);
    assert.equal(remoteMatch.excluded, false);
  });
});
