import assert from "node:assert/strict";
import test from "node:test";

import { buildConversationTarget, createTargetDraft, isTargetDraftValid } from "./conversationTargets";
import type { JobPosting } from "./types";

const job: JobPosting = {
  id: "job-1",
  company: "Acme",
  title: "Staff Engineer",
  location: "Remote",
  url: "https://example.com",
  salary: "",
  source: "manual",
  discoveredAt: "2026-04-29T00:00:00.000Z",
  confidence: 80,
  createdAt: "2026-04-29T00:00:00.000Z",
  updatedAt: "2026-04-29T00:00:00.000Z",
};

test("createTargetDraft returns expected defaults", () => {
  assert.deepEqual(createTargetDraft(), {
    name: "",
    title: "",
    relationshipType: "unknown",
    profileUrl: "",
    email: "",
    source: "manual",
    notes: "",
  });
});

test("isTargetDraftValid requires job and non-empty name", () => {
  const draft = createTargetDraft();
  assert.equal(isTargetDraftValid(job, draft), false);
  assert.equal(isTargetDraftValid(undefined, { ...draft, name: "Jane" }), false);
  assert.equal(isTargetDraftValid(job, { ...draft, name: "Jane" }), true);
});

test("buildConversationTarget trims fields and builds stable id", () => {
  const target = buildConversationTarget({
    jobId: job.id,
    job,
    draft: { ...createTargetDraft(), name: " Jane Doe ", title: " Director ", profileUrl: " https://linkedin.com/in/jane ", email: " jane@example.com ", notes: " intro ", relationshipType: "recruiter", source: "linkedin" },
    nowIso: "2026-04-29T12:00:00.000Z",
  });

  assert.equal(target.id, "job-1:manual:jane-doe");
  assert.equal(target.company, "Acme");
  assert.equal(target.name, "Jane Doe");
  assert.equal(target.title, "Director");
  assert.equal(target.profileUrl, "https://linkedin.com/in/jane");
  assert.equal(target.email, "jane@example.com");
  assert.equal(target.notes, "intro");
  assert.equal(target.confidence, 50);
});
