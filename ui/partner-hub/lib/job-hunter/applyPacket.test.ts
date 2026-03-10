import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateTailoringPacket } from "./resume/tailor";
import { buildApplyPacket } from "./applyPacket";
import type { JobPosting, ResumeProfile } from "./types";

const profile: ResumeProfile = {
  fullName: "James Wang",
  email: "james@example.com",
  phone: "555-0101",
  cityState: "Austin, TX",
  linkedinUrl: "https://linkedin.com/in/james",
  websiteUrl: "",
  workAuthorizationNote: "US Citizen",
  signatureLine: "Best regards,",
  headline: "Staff Engineer",
  summary: "Built enterprise cloud solutions.",
  skills: ["AWS", "Architecture"],
  experience: [{ company: "Example", title: "Architect", bullets: ["Led platform modernization"] }],
  achievements: ["Scaled migration program"],
};

describe("buildApplyPacket", () => {
  it("returns expected packet structure", () => {
    const job: JobPosting = {
      id: "job-101",
      title: "Senior Solutions Architect",
      company: "Acme Cloud",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const tailoringPacket = generateTailoringPacket(job, profile);

    const packet = buildApplyPacket(job, tailoringPacket, profile);

    assert.equal(packet.jobId, job.id);
    assert.ok(Date.parse(packet.generatedAt) > 0);
    assert.ok(packet.summaryMarkdown.includes("## Application Summary"));
    assert.ok(packet.fullPacketMarkdown.includes("# Job Hunter Apply Packet"));
    assert.ok(packet.summaryMarkdown.includes("**Candidate:** James Wang"));
    assert.ok(packet.summaryMarkdown.includes("### Tailored Resume Delta"));
  });

  it("normalizes the output filename", () => {
    const job: JobPosting = {
      id: "job-202",
      title: "Staff SRE / Platform",
      company: "Münchën + Sons, Inc.",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const tailoringPacket = generateTailoringPacket(job, profile);

    const packet = buildApplyPacket(job, tailoringPacket, profile);

    assert.equal(packet.fileBaseName, "munchen-sons-inc-staff-sre-platform-apply-packet");
  });

  it("includes cover letter, screener answers, and follow-up email", () => {
    const job: JobPosting = {
      id: "job-303",
      title: "Customer Success Engineer",
      company: "Northwind",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const tailoringPacket = generateTailoringPacket(job, profile);

    const packet = buildApplyPacket(job, tailoringPacket, profile);

    assert.ok(packet.coverLetterMarkdown.includes("Dear Hiring Team"));
    assert.ok(packet.screenerAnswersText.includes("Why are you interested in this role?"));
    assert.ok(packet.followUpEmailText.includes("wanted to follow up on next steps"));
    assert.ok(packet.followUpEmailText.includes("James Wang"));
    assert.ok(!packet.followUpEmailText.includes("[Your Name]"));
    assert.ok(packet.fullPacketMarkdown.includes("## Cover Letter"));
    assert.ok(packet.fullPacketMarkdown.includes("## Screener Answers"));
    assert.ok(packet.fullPacketMarkdown.includes("## Follow-up Email"));
  });
});
