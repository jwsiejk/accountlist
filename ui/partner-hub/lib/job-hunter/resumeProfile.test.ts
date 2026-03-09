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
  });

  it("normalizes arrays and filters blank entries", () => {
    const normalized = normalizeResumeProfile({
      summary: "  Profile summary  ",
      skills: [" Architecture ", "", "  "],
      experience: [{ company: " Acme ", title: " SA ", bullets: [" Led delivery ", " "] }, { nope: true }],
      achievements: [" Won awards ", ""],
    });

    assert.equal(normalized.summary, "Profile summary");
    assert.deepEqual(normalized.skills, ["Architecture"]);
    assert.deepEqual(normalized.experience, [{ company: "Acme", title: "SA", bullets: ["Led delivery"], start: undefined, end: undefined }]);
    assert.deepEqual(normalized.achievements, ["Won awards"]);
  });

  it("renders profile markdown", () => {
    const markdown = resumeProfileToMarkdown({
      summary: "Summary",
      skills: ["Skill A"],
      experience: [{ company: "Acme", title: "Architect", start: "2020", end: "2023", bullets: ["Built platform"] }],
      achievements: ["Achievement A"],
    });

    assert.ok(markdown.includes("# Resume Profile"));
    assert.ok(markdown.includes("## Experience"));
    assert.ok(markdown.includes("Built platform"));
  });
});
