import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectSourceFromUrl } from "./sourceDetection";

describe("source URL detection", () => {
  it("detects greenhouse URLs", () => {
    assert.deepEqual(detectSourceFromUrl("https://boards.greenhouse.io/acme"), {
      boardType: "greenhouse",
      boardToken: "acme",
      company: "Acme",
    });
  });

  it("detects lever URLs", () => {
    assert.deepEqual(detectSourceFromUrl("https://jobs.lever.co/stripe/1a2b3c"), {
      boardType: "lever",
      boardToken: "stripe",
      company: "Stripe",
    });
  });

  it("detects ashby URLs", () => {
    assert.deepEqual(detectSourceFromUrl("https://jobs.ashbyhq.com/notion"), {
      boardType: "ashby",
      boardToken: "notion",
      company: "Notion",
    });
  });

  it("detects smartrecruiters URLs", () => {
    assert.deepEqual(detectSourceFromUrl("https://jobs.smartrecruiters.com/Datadog"), {
      boardType: "smartrecruiters",
      boardToken: "Datadog",
      company: "Datadog",
    });
  });

  it("returns null for unsupported URLs", () => {
    assert.equal(detectSourceFromUrl("https://example.com/jobs"), null);
  });
});
