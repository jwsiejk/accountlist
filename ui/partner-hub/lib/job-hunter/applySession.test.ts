import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildApplyPacket } from "./applyPacket";
import { buildApplySessionPayload, toApplySessionJson } from "./applySession";
import { generateTailoringPacket } from "./resume/tailor";
import type { JobPosting, ResumeProfile } from "./types";

const profile: ResumeProfile = {
  fullName: "James Wang",
  email: "james@example.com",
  phone: "555-0101",
  cityState: "Austin, TX",
  linkedinUrl: "https://linkedin.com/in/james",
  websiteUrl: "https://james.dev",
  workAuthorizationNote: "US Citizen",
  signatureLine: "Best regards,",
  headline: "Staff Engineer",
  summary: "Built enterprise cloud solutions.",
  skills: ["AWS", "Architecture"],
  experience: [{ company: "Example", title: "Architect", bullets: ["Led platform modernization"] }],
  achievements: ["Scaled migration program"],
};

describe("buildApplySessionPayload", () => {
  it("returns deterministic per-job session payload with required fields", () => {
    const job: JobPosting = {
      id: "job-100",
      title: "Solutions Architect",
      company: "Contoso",
      source: "company-site",
      sourceProvider: "greenhouse",
      sourceUrl: "https://boards.greenhouse.io/contoso/jobs/123",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const tailoringPacket = generateTailoringPacket(job, profile);
    const applyPacket = buildApplyPacket(job, tailoringPacket, profile);
    const session = buildApplySessionPayload(job, tailoringPacket, applyPacket, profile);

    assert.equal(session.sessionId, "apply-session-job-100");
    assert.equal(session.provider, "greenhouse");
    assert.equal(session.sourceUrl, "https://boards.greenhouse.io/contoso/jobs/123");
    assert.equal(session.candidate.firstName, "James");
    assert.equal(session.candidate.lastName, "Wang");
    assert.equal(session.candidate.linkedinUrl, "https://linkedin.com/in/james");
    assert.ok(session.tailored.coverLetterText.includes("Dear Hiring Team"));
    assert.ok(session.tailored.screenerAnswers.length > 0);
    assert.ok(session.artifacts.tailoredResumeDocxFileName.endsWith("-resume.docx"));
    assert.ok(session.artifacts.coverLetterDocxFileName.endsWith("-cover-letter.docx"));
  });

  it("serializes payload as formatted JSON", () => {
    const job: JobPosting = {
      id: "job-200",
      title: "Staff Engineer",
      company: "Northwind",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const tailoringPacket = generateTailoringPacket(job, profile);
    const applyPacket = buildApplyPacket(job, tailoringPacket, profile);
    const session = buildApplySessionPayload(job, tailoringPacket, applyPacket, profile);
    const json = toApplySessionJson(session);

    assert.ok(json.includes('"sessionId": "apply-session-job-200"'));
    assert.ok(json.endsWith("\n"));
  });
});
