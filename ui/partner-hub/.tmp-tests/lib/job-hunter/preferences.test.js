"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const preferences_1 = require("./preferences");
const baseJob = {
    id: "job-1",
    title: "Partner Solutions Architect",
    company: "Contoso",
    source: "manual",
    location: "Remote - US",
    isRemote: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
};
(0, node_test_1.describe)("preferences", () => {
    (0, node_test_1.it)("returns James defaults", () => {
        const defaults = (0, preferences_1.getDefaultPreferences)();
        assert.deepEqual(defaults.targetRoles, preferences_1.JAMES_DEFAULT_TARGET_ROLES);
        assert.deepEqual(defaults.targetKeywords, preferences_1.JAMES_DEFAULT_TARGET_KEYWORDS);
        assert.deepEqual(defaults.preferredHybridLocations, preferences_1.JAMES_DEFAULT_HYBRID_LOCATIONS);
        assert.deepEqual(defaults.preferredRemoteRegions, preferences_1.JAMES_DEFAULT_REMOTE_REGIONS);
        assert.equal(defaults.allowRemoteRoles, true);
        assert.equal(defaults.allowHybridRoles, true);
        assert.equal(defaults.allowOnsiteRoles, false);
    });
    (0, node_test_1.it)("migrates legacy remoteOnly payloads", () => {
        const result = (0, preferences_1.normalizePreferences)({
            targetRoles: ["  architect  "],
            targetLocations: [" Philadelphia "],
            remoteOnly: true,
        });
        assert.equal(result.allowRemoteRoles, true);
        assert.equal(result.allowHybridRoles, false);
        assert.equal(result.allowOnsiteRoles, false);
        assert.deepEqual(result.preferredHybridLocations, ["Philadelphia"]);
    });
    (0, node_test_1.it)("classifies arrangement deterministically", () => {
        assert.equal((0, preferences_1.classifyWorkArrangement)({ ...baseJob, location: "Remote - United States" }), "remote");
        assert.equal((0, preferences_1.classifyWorkArrangement)({ ...baseJob, location: "Philadelphia, PA", notes: "Hybrid role, 2 days in office" }), "hybrid");
        assert.equal((0, preferences_1.classifyWorkArrangement)({ ...baseJob, isRemote: false, location: "New York, NY", notes: "Office-based position" }), "onsite");
        assert.equal((0, preferences_1.classifyWorkArrangement)({ ...baseJob, isRemote: false, location: "Pennsylvania" }), "unknown");
    });
    (0, node_test_1.it)("matches hybrid Philly and remote US while excluding onsite by default", () => {
        const preferences = (0, preferences_1.getDefaultPreferences)();
        const hybridMatch = (0, preferences_1.jobMatchesPreferences)({ ...baseJob, location: "King of Prussia, PA", notes: "Hybrid schedule" }, preferences);
        const remoteMatch = (0, preferences_1.jobMatchesPreferences)({ ...baseJob, location: "Remote - United States", notes: "Fully remote" }, preferences);
        const onsiteMatch = (0, preferences_1.jobMatchesPreferences)({ ...baseJob, isRemote: false, location: "Philadelphia, PA", notes: "On-site required" }, preferences);
        assert.equal(hybridMatch.excluded, false);
        assert.equal(remoteMatch.excluded, false);
        assert.equal(onsiteMatch.excluded, true);
        assert.ok(onsiteMatch.reasons.includes("Onsite roles disabled"));
    });
    (0, node_test_1.it)("matches hybrid Philly and remote US when preference signal exists in notes", () => {
        const hybridPreferences = {
            ...(0, preferences_1.getDefaultPreferences)(),
            preferredHybridLocations: ["Philadelphia"],
        };
        const remotePreferences = {
            ...(0, preferences_1.getDefaultPreferences)(),
            preferredRemoteRegions: ["United States"],
        };
        const hybridMatch = (0, preferences_1.jobMatchesPreferences)({
            ...baseJob,
            location: "Pennsylvania",
            notes: "Hybrid schedule with 2 days/week in our Philadelphia office",
        }, hybridPreferences);
        const remoteMatch = (0, preferences_1.jobMatchesPreferences)({
            ...baseJob,
            location: "Remote",
            notes: "Fully remote role; candidates must be based in the United States",
        }, remotePreferences);
        assert.equal(hybridMatch.excluded, false);
        assert.equal(remoteMatch.excluded, false);
    });
});
