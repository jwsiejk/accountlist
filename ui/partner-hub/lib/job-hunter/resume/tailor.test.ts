import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import type { JobPosting } from "../types";
import { masterResume } from "./masterResume";
import { generateTailoringPacket } from "./tailor";

describe("generateTailoringPacket", () => {
  it("builds json and markdown packet outputs", () => {
    const job: JobPosting = {
      id: "lever:123",
      title: "Partner Solutions Architect",
      company: "Nimbus Data",
      location: "Remote",
      department: "Post-sales Infrastructure",
      notes: "Storage + cloud",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    };

    const packet = generateTailoringPacket(job, masterResume);

    assert.equal(packet.jobId, job.id);
    assert.ok(packet.fit.score >= 0 && packet.fit.score <= 100);
    assert.ok(packet.keywordMap.matched.length > 0);
    assert.ok(packet.tailoredSummary.includes(job.title));
    assert.ok(packet.markdown.includes("# Resume Tailoring Packet"));
    assert.ok(packet.markdown.includes("## Cover Letter Draft"));
  });

  it("supports resume profile input", () => {
    const job: JobPosting = {
      id: "greenhouse:456",
      title: "Solutions Architect",
      company: "Acme",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    };

    const packet = generateTailoringPacket(job, {
      summary: "Profile summary",
      skills: ["Cloud"],
      experience: [{ company: "Acme", title: "Architect", bullets: ["Built platform"] }],
      achievements: ["Led migration"],
    });

    assert.ok(packet.tailoredSummary.includes("Profile summary"));
    assert.ok(packet.coverLetterDraft.includes("Sincerely,"));
  });
});
