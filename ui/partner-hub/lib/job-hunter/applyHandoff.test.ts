import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildApplyHandoffPlan, buildApplyReadinessSummary } from "./applyHandoff";
import { buildApplyPacket, buildApplyPrepItems } from "./applyPacket";
import { generateTailoringPacket } from "./resume/tailor";
import type { BoardType, JobPosting, ResumeProfile } from "./types";

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

const buildJob = (sourceProvider?: BoardType): JobPosting => ({
  id: `job-${sourceProvider ?? "generic"}`,
  title: "Senior Solutions Architect",
  company: "Acme Cloud",
  sourceProvider,
  source: "company-site",
  sourceUrl: "https://acme.example/jobs/1",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
});

describe("buildApplyHandoffPlan", () => {
  it("builds deterministic plans for supported providers", () => {
    const providers: BoardType[] = ["greenhouse", "lever", "ashby", "smartrecruiters"];

    providers.forEach((provider) => {
      const job = buildJob(provider);
      const tailoringPacket = generateTailoringPacket(job, profile);
      const packet = buildApplyPacket(job, tailoringPacket, profile);
      const prepItems = buildApplyPrepItems(job, packet, tailoringPacket, profile);
      const handoff = buildApplyHandoffPlan(job, prepItems);

      assert.equal(handoff.provider, provider);
      assert.ok(handoff.providerLabel.length > 0);
      assert.ok(handoff.likelySteps.length >= 3);
      assert.ok(handoff.groupedPrepItems[0]?.group === "upload");
      assert.ok(handoff.recommendedArtifacts.length >= 2);
    });
  });

  it("preserves generic behavior when provider data is missing", () => {
    const job = buildJob(undefined);
    const tailoringPacket = generateTailoringPacket(job, profile);
    const packet = buildApplyPacket(job, tailoringPacket, profile);
    const prepItems = buildApplyPrepItems(job, packet, tailoringPacket, profile);
    const handoff = buildApplyHandoffPlan(job, prepItems);

    assert.equal(handoff.provider, "generic");
    assert.equal(handoff.providerLabel, "Generic application portal");
    assert.ok(handoff.likelySteps.some((step) => step.includes("Open external application")));
  });
});

describe("buildApplyReadinessSummary", () => {
  it("returns all-ready when key fields are present", () => {
    const job = buildJob("lever");
    const tailoringPacket = generateTailoringPacket(job, profile);
    const packet = buildApplyPacket(job, tailoringPacket, profile);
    const prepItems = buildApplyPrepItems(job, packet, tailoringPacket, profile);

    const readiness = buildApplyReadinessSummary(job, prepItems, {
      selectedForApply: true,
      tailoredResumeReady: true,
      coverLetterReady: true,
      screenerAnswersReady: true,
      externalApplicationOpened: false,
      tailoredResumeUploaded: false,
      customQuestionsCompleted: false,
      finalExternalSubmitConfirmed: false,
      followUpScheduled: false,
    });

    assert.equal(readiness.resumeReady, true);
    assert.equal(readiness.coverLetterReady, true);
    assert.equal(readiness.candidateProfileReady, true);
    assert.equal(readiness.providerHandoffReady, true);
  });

  it("flags not-ready when placeholders remain", () => {
    const job = buildJob("ashby");
    const tailoringPacket = generateTailoringPacket(job, { ...profile, linkedinUrl: "", workAuthorizationNote: "" });
    const packet = buildApplyPacket(job, tailoringPacket, { ...profile, linkedinUrl: "", workAuthorizationNote: "" });
    const prepItems = buildApplyPrepItems(job, packet, tailoringPacket, { ...profile, linkedinUrl: "", workAuthorizationNote: "" });

    const readiness = buildApplyReadinessSummary(job, prepItems);

    assert.equal(readiness.candidateProfileReady, false);
    assert.equal(readiness.providerHandoffReady, true);
  });
});
