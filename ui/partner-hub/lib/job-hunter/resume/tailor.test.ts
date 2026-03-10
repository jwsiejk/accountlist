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
    assert.ok(packet.tailoredResumeVariant.markdown.includes("# Tailored Resume Variant"));
  });


  it("uses preferences when calculating fit", () => {
    const job: JobPosting = {
      id: "pref:789",
      title: "Solutions Architect",
      company: "Nimbus Data",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    };

    const withoutPreferences = generateTailoringPacket(job, masterResume);
    const withExclusion = generateTailoringPacket(job, masterResume, {
      targetRoles: [],
      targetKeywords: [],
      targetLocations: [],
      preferredHybridLocations: [],
      preferredRemoteRegions: [],
      allowRemoteRoles: true,
      allowHybridRoles: true,
      allowOnsiteRoles: false,
      remoteOnly: false,
      excludedCompanies: ["Nimbus"],
      excludedTitles: [],
      minimumScore: 0,
    });

    assert.notEqual(withoutPreferences.fit.score, 0);
    assert.equal(withExclusion.fit.score, 0);
    assert.ok(withExclusion.fit.preferenceSignals.includes("Excluded company match"));
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
      fullName: "James Wang",
      email: "james@example.com",
      phone: "555-0101",
      cityState: "Austin, TX",
      linkedinUrl: "https://linkedin.com/in/james",
      websiteUrl: "",
      workAuthorizationNote: "US Citizen",
      signatureLine: "Best regards,",
      headline: "Staff Engineer",
      summary: "Profile summary",
      skills: ["Cloud"],
      experience: [{ company: "Acme", title: "Architect", bullets: ["Built platform"] }],
      achievements: ["Led migration"],
    });

    assert.ok(packet.tailoredSummary.includes("Profile summary"));
    assert.ok(packet.coverLetterDraft.includes("Best regards,"));
    assert.ok(packet.coverLetterDraft.includes("James Wang"));
    assert.ok(packet.tailoredResumeVariant.deltaSummary.some((line) => line.includes("Base resume profile remains unchanged")));
  });

  it("falls back to default signature and signer when resume profile identity is blank", () => {
    const job: JobPosting = {
      id: "greenhouse:empty-profile",
      title: "Solutions Architect",
      company: "Acme",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    };

    const packet = generateTailoringPacket(job, {
      fullName: "   ",
      email: "james@example.com",
      phone: "555-0101",
      cityState: "Austin, TX",
      linkedinUrl: "https://linkedin.com/in/james",
      websiteUrl: "",
      workAuthorizationNote: "US Citizen",
      signatureLine: "   ",
      headline: "Staff Engineer",
      summary: "Profile summary",
      skills: ["Cloud"],
      experience: [{ company: "Acme", title: "Architect", bullets: ["Built platform"] }],
      achievements: ["Led migration"],
    });

    assert.ok(packet.coverLetterDraft.includes("Sincerely,"));
    assert.ok(packet.coverLetterDraft.includes("Candidate"));
  });

  it("uses posting snapshot notes in tailored outputs", () => {
    const job: JobPosting = {
      id: "lever:notes",
      title: "Partner Architect",
      company: "Acme",
      notes: "Lead partner workshops for cloud infrastructure adoption and storage migration.",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    };

    const packet = generateTailoringPacket(job, masterResume);

    assert.ok(packet.tailoredSummary.includes("Posting snapshot:"));
    assert.ok(packet.tailoredBullets[1].includes("Context from posting:"));
  });
});
