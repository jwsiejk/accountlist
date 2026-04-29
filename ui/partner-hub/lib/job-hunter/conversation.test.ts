import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { appendConversationMessage, buildConversationDraft, createConversationThread } from "./conversation";

describe("job hunter conversation service", () => {
  it("creates deterministic thread IDs and appends deterministic message IDs", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");
    const thread = createConversationThread({ jobId: "job-1", type: "initial_outreach", now });
    assert.equal(thread.id, "job-1:initial_outreach");

    const updated = appendConversationMessage(thread, {
      role: "user",
      body: "draft",
      createdAt: "2026-01-10T12:00:01.000Z",
    });

    assert.equal(updated.messages[0].id, "job-1:initial_outreach:m-1");
  });

  it("builds deterministic drafts by conversation type", () => {
    const now = new Date("2026-01-10T12:00:00.000Z");
    const snapshot = { jobId: "j1", title: "Staff Engineer", company: "Acme" };

    const initial = buildConversationDraft({ type: "initial_outreach", snapshot, now });
    const followUp = buildConversationDraft({ type: "follow_up", snapshot, now });
    const thanks = buildConversationDraft({ type: "post_interview_thanks", snapshot, now });

    assert.equal(initial.subject, "Intro: Staff Engineer at Acme");
    assert.equal(followUp.subject, "Follow-up on Staff Engineer application");
    assert.equal(thanks.subject, "Thank you — Staff Engineer discussion");
  });
});
