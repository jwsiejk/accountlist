import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateTailoringPacket } from "./resume/tailor";
import { buildApplyPacket } from "./applyPacket";
import type { JobPosting } from "./types";

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

    const tailoringPacket = generateTailoringPacket(job, {
      summary: "Built enterprise cloud solutions.",
      skills: ["AWS", "Architecture"],
      experience: [{ company: "Example", title: "Architect", bullets: ["Led platform modernization"] }],
      achievements: ["Scaled migration program"],
    });

    const packet = buildApplyPacket(job, tailoringPacket);

    assert.equal(packet.jobId, job.id);
    assert.ok(Date.parse(packet.generatedAt) > 0);
    assert.ok(packet.summaryMarkdown.includes("## Application Summary"));
    assert.ok(packet.fullPacketMarkdown.includes("# Job Hunter Apply Packet"));
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

    const tailoringPacket = generateTailoringPacket(job, {
      summary: "Summary",
      skills: ["Ops"],
      experience: [{ company: "Example", title: "Engineer", bullets: ["Built systems"] }],
      achievements: ["Improved reliability"],
    });

    const packet = buildApplyPacket(job, tailoringPacket);

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

    const tailoringPacket = generateTailoringPacket(job, {
      summary: "I help customers win with technical solutions.",
      skills: ["Support"],
      experience: [{ company: "Example", title: "Engineer", bullets: ["Delivered outcomes"] }],
      achievements: ["Improved onboarding"],
    });

    const packet = buildApplyPacket(job, tailoringPacket);

    assert.ok(packet.coverLetterMarkdown.includes("Dear Hiring Team"));
    assert.ok(packet.screenerAnswersText.includes("Why are you interested in this role?"));
    assert.ok(packet.followUpEmailText.includes("wanted to follow up on next steps"));
    assert.ok(packet.fullPacketMarkdown.includes("## Cover Letter"));
    assert.ok(packet.fullPacketMarkdown.includes("## Screener Answers"));
    assert.ok(packet.fullPacketMarkdown.includes("## Follow-up Email"));
  });
});
