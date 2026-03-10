import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { masterResume } from "./resume/masterResume";
import { getDefaultResumeProfile, normalizeResumeProfile, resumeProfileToMarkdown } from "./resumeProfile";

describe("resumeProfile helpers", () => {
  it("creates defaults from the master resume", () => {
    const profile = getDefaultResumeProfile();

    assert.equal(profile.summary, masterResume.summary);
    assert.deepEqual(profile.skills, masterResume.skills);
    assert.equal(profile.experience[0]?.title, masterResume.experience[0]?.role);
    assert.equal(profile.fullName, "");
    assert.equal(profile.email, "");
  });

  it("normalizes arrays and filters blank entries", () => {
    const normalized = normalizeResumeProfile({
      fullName: " James Wang ",
      email: " james@example.com ",
      phone: " 555-0101 ",
      cityState: " Austin, TX ",
      linkedinUrl: " https://linkedin.com/in/james ",
      websiteUrl: " https://james.dev ",
      workAuthorizationNote: " US Citizen ",
      signatureLine: " Best regards, ",
      headline: " Staff Engineer ",
      summary: "  Profile summary  ",
      skills: [" Architecture ", "", "  "],
      experience: [{ company: " Acme ", title: " SA ", bullets: [" Led delivery ", " "] }, { nope: true }],
      achievements: [" Won awards ", ""],
    });

    assert.equal(normalized.fullName, "James Wang");
    assert.equal(normalized.headline, "Staff Engineer");
    assert.equal(normalized.summary, "Profile summary");
    assert.deepEqual(normalized.skills, ["Architecture"]);
    assert.deepEqual(normalized.experience, [{ company: "Acme", title: "SA", bullets: ["Led delivery"], start: undefined, end: undefined }]);
    assert.deepEqual(normalized.achievements, ["Won awards"]);
  });

  it("hydrates missing identity fields from legacy profile safely", () => {
    const normalized = normalizeResumeProfile({
      summary: "Legacy summary",
      skills: ["Communication"],
      experience: [],
      achievements: [],
    });

    assert.equal(normalized.fullName, "");
    assert.equal(normalized.signatureLine, "");
    assert.equal(normalized.summary, "Legacy summary");
  });

  it("renders profile markdown", () => {
    const markdown = resumeProfileToMarkdown({
      fullName: "James Wang",
      email: "james@example.com",
      phone: "555-0101",
      cityState: "Austin, TX",
      linkedinUrl: "https://linkedin.com/in/james",
      websiteUrl: "",
      workAuthorizationNote: "US Citizen",
      signatureLine: "Best regards,",
      headline: "Staff Engineer",
      summary: "Summary",
      skills: ["Skill A"],
      experience: [{ company: "Acme", title: "Architect", start: "2020", end: "2023", bullets: ["Built platform"] }],
      achievements: ["Achievement A"],
    });

    assert.ok(markdown.includes("## Identity"));
    assert.ok(markdown.includes("James Wang"));
    assert.ok(markdown.includes("## Experience"));
    assert.ok(markdown.includes("Built platform"));
  });
});
