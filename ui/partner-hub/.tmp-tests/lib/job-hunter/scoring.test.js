"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const preferences_1 = require("./preferences");
const scoring_1 = require("./scoring");
const baseJob = {
    id: "greenhouse:1",
    title: "Senior Solutions Architect, Partner Infrastructure",
    company: "Acme",
    location: "Remote",
    department: "Post-sales",
    source: "company-site",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
};
(0, node_test_1.describe)("scoreJobFit", () => {
    (0, node_test_1.it)("returns a higher score for strong keyword coverage", () => {
        const result = (0, scoring_1.scoreJobFit)({ ...baseJob, notes: "Cloud storage infra partner workshops" });
        assert.ok(result.score >= 70);
    });
    (0, node_test_1.it)("supports remote US and hybrid Philly preference boosts", () => {
        const remotePreferences = {
            ...(0, preferences_1.getDefaultPreferences)(),
            preferredRemoteRegions: ["United States"],
        };
        const hybridPreferences = {
            ...(0, preferences_1.getDefaultPreferences)(),
            preferredHybridLocations: ["Philadelphia"],
        };
        const remoteResult = (0, scoring_1.scoreJobFit)({ ...baseJob, location: "Remote", notes: "remote across the United States" }, remotePreferences);
        const hybridResult = (0, scoring_1.scoreJobFit)({ ...baseJob, location: "Pennsylvania", notes: "hybrid role with Philadelphia office days" }, hybridPreferences);
        assert.ok(remoteResult.preferenceSignals.some((signal) => signal.includes("Matched remote region")));
        assert.ok(hybridResult.preferenceSignals.some((signal) => signal.includes("Matched hybrid location")));
    });
    (0, node_test_1.it)("penalizes unknown arrangement so it is not over-promoted", () => {
        const known = (0, scoring_1.scoreJobFit)({ ...baseJob, notes: "Remote role" }, (0, preferences_1.getDefaultPreferences)());
        const unknown = (0, scoring_1.scoreJobFit)({ ...baseJob, location: "Pennsylvania", notes: "Some travel" }, (0, preferences_1.getDefaultPreferences)());
        assert.ok(unknown.preferenceSignals.includes("Work arrangement unknown"));
        assert.ok(unknown.score < known.score);
    });
    (0, node_test_1.it)("zeros score for excluded company and title", () => {
        assert.equal((0, scoring_1.scoreJobFit)(baseJob, { ...(0, preferences_1.getDefaultPreferences)(), excludedCompanies: ["acme"] }).score, 0);
        assert.equal((0, scoring_1.scoreJobFit)(baseJob, { ...(0, preferences_1.getDefaultPreferences)(), excludedTitles: ["architect"] }).score, 0);
    });
    (0, node_test_1.it)("prefers exclusion summaries for excluded rows", () => {
        assert.equal((0, scoring_1.summarizeJobReason)({
            excluded: true,
            exclusionReasons: ["Onsite roles disabled"],
            preferenceSignals: ["Matched target role: solutions architect"],
        }), "Excluded: Onsite roles disabled");
        assert.equal((0, scoring_1.summarizeJobReason)({
            excluded: false,
            exclusionReasons: [],
            preferenceSignals: ["Matched target role: solutions architect"],
        }), "Matched target role: solutions architect");
    });
});
