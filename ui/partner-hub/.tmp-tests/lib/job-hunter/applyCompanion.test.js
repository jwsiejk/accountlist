"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_test_1 = require("node:test");
const applyCompanion_1 = require("./applyCompanion");
const session = {
    version: "1",
    sessionId: "apply-session-job-1",
    jobId: "job-1",
    provider: "lever",
    sourceUrl: "https://jobs.lever.co/example/123",
    candidate: {
        fullName: "James Wang",
        firstName: "James",
        lastName: "Wang",
        email: "james@example.com",
        phone: "555-0101",
        cityState: "Austin, TX",
        linkedinUrl: "https://linkedin.com/in/james",
        websiteUrl: "https://james.dev",
        workAuthorizationNote: "US Citizen",
    },
    tailored: {
        headline: "Staff Engineer",
        summary: "Summary",
        coverLetterText: "Dear Hiring Team",
        screenerAnswers: [],
    },
    artifacts: {
        tailoredResumeDocxFileName: "james-example-role-resume.docx",
        coverLetterDocxFileName: "james-example-role-cover-letter.docx",
        applyPacketFileName: "example.md",
    },
};
(0, node_test_1.describe)("apply companion provider detection", () => {
    (0, node_test_1.it)("detects supported ATS providers", () => {
        assert.equal((0, applyCompanion_1.detectApplyProviderFromUrl)("https://boards.greenhouse.io/acme/jobs/12"), "greenhouse");
        assert.equal((0, applyCompanion_1.detectApplyProviderFromUrl)("https://jobs.lever.co/acme/12"), "lever");
        assert.equal((0, applyCompanion_1.detectApplyProviderFromUrl)("https://jobs.ashbyhq.com/acme/12"), "ashby");
        assert.equal((0, applyCompanion_1.detectApplyProviderFromUrl)("https://jobs.smartrecruiters.com/acme/12"), "smartrecruiters");
    });
    (0, node_test_1.it)("returns null for unknown providers", () => {
        assert.equal((0, applyCompanion_1.detectApplyProviderFromUrl)("https://example.com/jobs/12"), null);
    });
});
(0, node_test_1.describe)("apply companion field matching heuristics", () => {
    (0, node_test_1.it)("matches common identity fields deterministically", () => {
        assert.equal((0, applyCompanion_1.matchBasicFieldKey)({ tagName: "input", name: "first_name" }, "greenhouse"), "firstName");
        assert.equal((0, applyCompanion_1.matchBasicFieldKey)({ tagName: "input", placeholder: "Last Name" }, "greenhouse"), "lastName");
        assert.equal((0, applyCompanion_1.matchBasicFieldKey)({ tagName: "input", ariaLabel: "Email address" }, "lever"), "email");
        assert.equal((0, applyCompanion_1.matchBasicFieldKey)({ tagName: "input", labelText: "LinkedIn profile" }, "lever"), "linkedinUrl");
        assert.equal((0, applyCompanion_1.matchBasicFieldKey)({ tagName: "textarea", labelText: "Cover Letter" }, "ashby"), "coverLetterText");
    });
    (0, node_test_1.it)("avoids ambiguous/unsafe mappings", () => {
        assert.equal((0, applyCompanion_1.matchBasicFieldKey)({ tagName: "input", labelText: "Relocation support needed?" }, "lever"), null);
        assert.equal((0, applyCompanion_1.matchBasicFieldKey)({ tagName: "input", labelText: "Why do you want this role?" }, "lever"), null);
        assert.equal((0, applyCompanion_1.matchBasicFieldKey)({ tagName: "input" }, "lever"), null);
    });
    (0, node_test_1.it)("returns expected session values for mapped keys", () => {
        assert.equal((0, applyCompanion_1.getFieldValueForKey)("fullName", session), "James Wang");
        assert.equal((0, applyCompanion_1.getFieldValueForKey)("websiteUrl", session), "https://james.dev");
        assert.equal((0, applyCompanion_1.getFieldValueForKey)("coverLetterText", session), "Dear Hiring Team");
    });
    (0, node_test_1.it)("selects city/state variants when location fields are split", () => {
        assert.equal((0, applyCompanion_1.selectLocationValueFromCityState)("Austin, TX", "city"), "Austin");
        assert.equal((0, applyCompanion_1.selectLocationValueFromCityState)("Austin, TX", "state"), "TX");
        assert.equal((0, applyCompanion_1.selectLocationValueFromCityState)("Austin, TX", "location"), "Austin, TX");
    });
});
(0, node_test_1.describe)("apply companion extension runtime wiring", () => {
    (0, node_test_1.it)("build entrypoint imports shared heuristics from applyCompanion.ts", () => {
        const source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(process.cwd(), "extensions/job-hunter-apply-companion/content.ts"), "utf8");
        assert.match(source, /from\s+["']\.\.\/\.\.\/lib\/job-hunter\/applyCompanion["']/);
    });
    (0, node_test_1.it)("no longer keeps a standalone heuristics runtime file", () => {
        const manifestSource = (0, node_fs_1.readFileSync)((0, node_path_1.join)(process.cwd(), "extensions/job-hunter-apply-companion/manifest.json"), "utf8");
        assert.doesNotMatch(manifestSource, /heuristics\.js/);
    });
});
