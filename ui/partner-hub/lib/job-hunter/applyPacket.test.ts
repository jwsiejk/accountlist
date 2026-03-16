import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateTailoringPacket } from "./resume/tailor";
import { buildApplyPacket, buildApplyPrepItems } from "./applyPacket";
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

  it("builds reusable prep helpers for guided apply", () => {
    const job: JobPosting = {
      id: "job-404",
      title: "Solutions Architect",
      company: "Contoso",
      source: "company-site",
      sourceUrl: "https://contoso.example/jobs/404",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const tailoringPacket = generateTailoringPacket(job, profile);
    const packet = buildApplyPacket(job, tailoringPacket, profile);
    const prepItems = buildApplyPrepItems(job, packet, tailoringPacket, profile);

    assert.equal(prepItems.length, 11);
    assert.equal(prepItems[0].key, "candidateContact");
    assert.ok(prepItems.find((item) => item.key === "linkedinUrl")?.value.includes("linkedin.com/in/james"));
    assert.equal(prepItems.find((item) => item.key === "sourceApplicationLink")?.value, "https://contoso.example/jobs/404");
    assert.equal(prepItems.find((item) => item.key === "tailoredResumeDocx")?.actionType, "download");
    assert.equal(prepItems.find((item) => item.key === "sourceApplicationLink")?.actionType, "open-link");
  });
  it("applies provider-aware prep grouping and priority", () => {
    const job: JobPosting = {
      id: "job-505",
      title: "Solutions Architect",
      company: "Contoso",
      source: "company-site",
      sourceProvider: "greenhouse",
      sourceUrl: "https://contoso.example/jobs/505",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const tailoringPacket = generateTailoringPacket(job, profile);
    const packet = buildApplyPacket(job, tailoringPacket, profile);
    const prepItems = buildApplyPrepItems(job, packet, tailoringPacket, profile);

    assert.equal(prepItems.find((item) => item.key === "tailoredResumeDocx")?.group, "upload");
    assert.equal(prepItems.find((item) => item.key === "tailoredResumeDocx")?.priority, "required-first");
    assert.equal(prepItems.find((item) => item.key === "screenerAnswers")?.priority, "required-first");
    assert.ok(prepItems.find((item) => item.key === "screenerAnswers")?.providerHint?.includes("Greenhouse"));
    assert.equal(prepItems.find((item) => item.key === "tailoredResumeMarkdown")?.group, "paste");
    assert.equal(prepItems.find((item) => item.key === "coverLetterDocx")?.actionType, "download");
  });

});
