import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAtsArtifactFileName,
  buildCoverLetterDocLines,
  buildTailoredResumeDocLines,
  generateCoverLetterDocxArtifact,
  generateTailoredResumeDocxArtifact,
  normalizeForFileName,
} from "./docExports";
import { generateTailoredResumeVariant } from "./resume/variant";
import type { JobPosting, ResumeProfile } from "./types";

const profile: ResumeProfile = {
  fullName: "James Siejk",
  email: "james@example.com",
  phone: "555-0101",
  cityState: "Austin, TX",
  linkedinUrl: "https://linkedin.com/in/james",
  websiteUrl: "https://example.com",
  workAuthorizationNote: "Authorized to work in the US",
  signatureLine: "Sincerely,",
  headline: "Solutions Architect",
  summary: "Builds partner-facing technical solutions.",
  skills: ["Cloud architecture", "ATS optimization", "Sales engineering"],
  experience: [
    {
      company: "Acme",
      title: "Senior Architect",
      start: "2020",
      end: "Present",
      bullets: ["Led cloud migrations", "Built GTM playbooks", "Improved reporting quality"],
    },
  ],
  achievements: ["Increased adoption by 30%"],
};

const job: JobPosting = {
  id: "job-1",
  title: "Solutions Architect",
  company: "Acmé Systems",
  source: "company-site",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("docExports", () => {
  it("normalizes deterministic ATS-safe filenames", () => {
    assert.equal(normalizeForFileName("Münchën + Sons, Inc."), "munchen-sons-inc");
    assert.equal(
      buildAtsArtifactFileName("James Siejk", "Acmé Systems", "Solutions Architect", "resume"),
      "james-siejk-acme-systems-solutions-architect-resume.docx",
    );
  });

  it("builds tailored resume export lines from existing variant content", () => {
    const baseProfileBefore = JSON.stringify(profile);
    const variant = generateTailoredResumeVariant(job, profile);
    const lines = buildTailoredResumeDocLines(job, profile, variant);

    assert.equal(JSON.stringify(profile), baseProfileBefore);
    assert.ok(lines.includes("James Siejk"));
    assert.ok(lines.includes("SUMMARY"));
    assert.ok(lines.includes(variant.tailoredSummary));
    assert.ok(lines.some((line) => line.includes("TAILORING DELTA")));
    assert.ok(lines.some((line) => line.includes("Base resume profile remains unchanged")));
    for (const skill of variant.prioritizedSkills) {
      assert.ok(lines.includes(`• ${skill}`));
    }
  });

  it("generates non-empty DOCX artifacts for resume and cover letter", () => {
    const variant = generateTailoredResumeVariant(job, profile);
    const coverLetter = [
      "Dear Hiring Team,",
      "",
      "I am excited to apply.",
      "",
      "Sincerely,",
      "James Siejk",
    ].join("\n");

    const resumeArtifact = generateTailoredResumeDocxArtifact(job, profile, variant);
    const coverArtifact = generateCoverLetterDocxArtifact(job, profile, coverLetter);

    assert.equal(resumeArtifact.fileName, "james-siejk-acme-systems-solutions-architect-resume.docx");
    assert.equal(coverArtifact.fileName, "james-siejk-acme-systems-solutions-architect-cover-letter.docx");
    assert.equal(resumeArtifact.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.equal(coverArtifact.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.ok(resumeArtifact.bytes.length > 2000);
    assert.ok(coverArtifact.bytes.length > 1500);
    assert.equal(String.fromCharCode(...resumeArtifact.bytes.slice(0, 2)), "PK");
    assert.equal(String.fromCharCode(...coverArtifact.bytes.slice(0, 2)), "PK");

    const resumeDocxRaw = Buffer.from(resumeArtifact.bytes).toString("latin1");
    assert.ok(resumeDocxRaw.includes("[Content_Types].xml"));
    assert.ok(resumeDocxRaw.includes("docProps/core.xml"));
    assert.ok(resumeDocxRaw.includes("word/styles.xml"));
    assert.ok(resumeDocxRaw.includes("word/fontTable.xml"));
    assert.ok(resumeDocxRaw.includes("word/theme/theme1.xml"));
    assert.ok(resumeDocxRaw.includes("James Siejk"));
    assert.ok(resumeDocxRaw.includes("TAILORING DELTA (THIS JOB VARIANT ONLY)"));

    const coverDocxRaw = Buffer.from(coverArtifact.bytes).toString("latin1");
    assert.ok(coverDocxRaw.includes("Dear Hiring Team,"));
    assert.ok(coverDocxRaw.includes("Sincerely,"));
  });

  it("preserves deterministic cover-letter line mapping", () => {
    const coverLetter = "Dear Hiring Team,\n\nLine two\nSincerely,\nJames";
    const lines = buildCoverLetterDocLines(coverLetter);

    assert.deepEqual(lines, ["Dear Hiring Team,", "", "Line two", "Sincerely,", "James"]);
  });
});
