import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import * as vm from "node:vm";

import {
  detectApplyProviderFromUrl,
  getFieldValueForKey,
  matchBasicFieldKey,
  type CompanionFieldCandidate,
} from "./applyCompanion";
import type { ApplySessionPayload } from "./applySession";

const session: ApplySessionPayload = {
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

describe("apply companion provider detection", () => {
  it("detects supported ATS providers", () => {
    assert.equal(detectApplyProviderFromUrl("https://boards.greenhouse.io/acme/jobs/12"), "greenhouse");
    assert.equal(detectApplyProviderFromUrl("https://jobs.lever.co/acme/12"), "lever");
    assert.equal(detectApplyProviderFromUrl("https://jobs.ashbyhq.com/acme/12"), "ashby");
    assert.equal(detectApplyProviderFromUrl("https://jobs.smartrecruiters.com/acme/12"), "smartrecruiters");
  });

  it("returns null for unknown providers", () => {
    assert.equal(detectApplyProviderFromUrl("https://example.com/jobs/12"), null);
  });
});

describe("apply companion field matching heuristics", () => {
  it("matches common identity fields deterministically", () => {
    assert.equal(matchBasicFieldKey({ tagName: "input", name: "first_name" }, "greenhouse"), "firstName");
    assert.equal(matchBasicFieldKey({ tagName: "input", placeholder: "Last Name" }, "greenhouse"), "lastName");
    assert.equal(matchBasicFieldKey({ tagName: "input", ariaLabel: "Email address" }, "lever"), "email");
    assert.equal(matchBasicFieldKey({ tagName: "input", labelText: "LinkedIn profile" }, "lever"), "linkedinUrl");
    assert.equal(matchBasicFieldKey({ tagName: "textarea", labelText: "Cover Letter" }, "ashby"), "coverLetterText");
  });

  it("avoids ambiguous/unsafe mappings", () => {
    assert.equal(matchBasicFieldKey({ tagName: "input", labelText: "Relocation support needed?" }, "lever"), null);
    assert.equal(matchBasicFieldKey({ tagName: "input", labelText: "Why do you want this role?" }, "lever"), null);
    assert.equal(matchBasicFieldKey({ tagName: "input" }, "lever"), null);
  });

  it("returns expected session values for mapped keys", () => {
    assert.equal(getFieldValueForKey("fullName", session), "James Wang");
    assert.equal(getFieldValueForKey("websiteUrl", session), "https://james.dev");
    assert.equal(getFieldValueForKey("coverLetterText", session), "Dear Hiring Team");
  });

  it("keeps extension runtime heuristics aligned with tested helper behavior", () => {
    const scriptPath = join(process.cwd(), "extensions/job-hunter-apply-companion/heuristics.js");
    const runtimeSource = readFileSync(scriptPath, "utf8");
    const sandbox: { globalThis: { JobHunterApplyCompanionHeuristics?: any } } = { globalThis: {} };
    vm.runInNewContext(runtimeSource, sandbox);
    const runtime = sandbox.globalThis.JobHunterApplyCompanionHeuristics;

    assert.ok(runtime);

    const providers = ["greenhouse", "lever", "ashby", "smartrecruiters"] as const;
    const fields: CompanionFieldCandidate[] = [
      { tagName: "input", name: "first_name" },
      { tagName: "input", name: "last_name" },
      { tagName: "input", ariaLabel: "Email address" },
      { tagName: "input", labelText: "Phone number" },
      { tagName: "input", labelText: "LinkedIn profile" },
      { tagName: "input", labelText: "Personal website URL" },
      { tagName: "textarea", labelText: "Cover letter" },
      { tagName: "input", labelText: "Relocation support needed?" },
      { tagName: "input", labelText: "Candidate name" },
      { tagName: "input", labelText: "City" },
      { tagName: "input", labelText: "State" },
    ];

    for (const provider of providers) {
      for (const field of fields) {
        const signal = [field.id, field.name, field.placeholder, field.ariaLabel, field.labelText]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        assert.equal(
          runtime.matchKeyFromSignal({ signal, tagName: field.tagName, provider }),
          matchBasicFieldKey(field, provider),
        );
      }
    }

    assert.equal(runtime.selectLocationValue({ cityState: "Austin, TX", signal: "City" }), "Austin");
    assert.equal(runtime.selectLocationValue({ cityState: "Austin, TX", signal: "State" }), "TX");
    assert.equal(runtime.selectLocationValue({ cityState: "Austin, TX", signal: "Location" }), "Austin, TX");
  });
});
