import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { JobPosting, ResumeProfile } from "../types";
import { generateTailoredResumeVariant } from "./variant";

const baseProfile: ResumeProfile = {
  fullName: "James Wang",
  email: "james@example.com",
  phone: "555-0101",
  cityState: "Austin, TX",
  linkedinUrl: "https://linkedin.com/in/james",
  websiteUrl: "",
  workAuthorizationNote: "US Citizen",
  signatureLine: "Best regards,",
  headline: "Staff Engineer",
  summary: "Built enterprise cloud and infrastructure solutions.",
  skills: ["Kubernetes", "Storage strategy", "Partner enablement", "Cloud architecture"],
  experience: [
    {
      company: "Acme",
      title: "Solutions Architect",
      bullets: [
        "Led partner workshops for cloud migration programs.",
        "Implemented storage modernization for enterprise accounts.",
        "Created backend billing reports.",
      ],
    },
  ],
  achievements: ["Built reusable architecture patterns"],
};

describe("generateTailoredResumeVariant", () => {
  it("does not mutate the base profile", () => {
    const job: JobPosting = {
      id: "job-1",
      title: "Partner Solutions Architect",
      company: "Nimbus",
      notes: "Focus on cloud migration and partner architecture",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const before = JSON.stringify(baseProfile);
    generateTailoredResumeVariant(job, baseProfile);
    const after = JSON.stringify(baseProfile);

    assert.equal(after, before);
  });

  it("only uses source skills and bullets", () => {
    const job: JobPosting = {
      id: "job-2",
      title: "Storage Architect",
      company: "Nimbus",
      notes: "storage and enterprise migration",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const variant = generateTailoredResumeVariant(job, baseProfile);

    const sourceSkills = new Set(baseProfile.skills);
    for (const skill of variant.prioritizedSkills) {
      assert.ok(sourceSkills.has(skill));
    }

    const sourceBullets = new Set(baseProfile.experience.flatMap((item) => item.bullets));
    for (const entry of variant.experience) {
      for (const bullet of entry.selectedBullets) {
        assert.ok(sourceBullets.has(bullet));
      }
    }
  });

  it("prioritizes matching skills and generates artifacts with delta summary", () => {
    const job: JobPosting = {
      id: "job-3",
      title: "Cloud Partner Architect",
      company: "Nimbus",
      department: "Cloud",
      notes: "partner cloud architecture",
      source: "company-site",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    const variant = generateTailoredResumeVariant(job, baseProfile);

    assert.ok(variant.prioritizedSkills.indexOf("Cloud architecture") < variant.prioritizedSkills.indexOf("Kubernetes"));
    assert.ok(variant.deltaSummary.length >= 3);
    assert.ok(variant.markdown.includes("# Tailored Resume Variant"));
    assert.ok(variant.plainText.includes("TAILORED RESUME VARIANT"));
    assert.ok(variant.markdown.includes("Base profile modified: No"));
  });
});
