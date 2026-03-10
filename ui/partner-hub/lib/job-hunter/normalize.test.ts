import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { normalizeJobPosting } from "./normalize";

describe("normalizeJobPosting", () => {
  it("creates deterministic ids and normalizes fields", () => {
    const normalized = normalizeJobPosting({
      source: "greenhouse",
      externalId: " 123-ABC ",
      company: "  Acme Corp  ",
      title: " Senior   Engineer ",
      location: " Remote - US ",
      department: " Engineering ",
      url: "https://example.com/job/123",
      postedAt: "2024-10-01",
    });

    assert.equal(normalized.id, "greenhouse:123-abc");
    assert.equal(normalized.company, "Acme Corp");
    assert.equal(normalized.title, "Senior Engineer");
    assert.equal(normalized.location, "Remote");
    assert.equal(normalized.department, "Engineering");
    assert.equal(normalized.postedAt, "2024-10-01T00:00:00.000Z");
    assert.equal(normalized.isRemote, true);
    assert.equal(normalized.sourceProvider, "greenhouse");
  });

  it("falls back to Remote / TBD and omits invalid dates", () => {
    const normalized = normalizeJobPosting({
      source: "lever",
      externalId: "A1",
      company: "Example",
      title: "Product Manager",
      url: "https://jobs.example.com/a1",
      postedAt: "not-a-date",
    });

    assert.equal(normalized.id, "lever:a1");
    assert.equal(normalized.location, "Remote / TBD");
    assert.equal(normalized.postedAt, undefined);
    assert.equal(normalized.isRemote, false);
  });

  it("sanitizes and trims rich notes and optional fields", () => {
    const normalized = normalizeJobPosting({
      source: "greenhouse",
      externalId: 77,
      company: "Acme",
      title: "Engineer",
      url: "https://example.com/job/77",
      notes: "<p>Build <strong>storage</strong> systems &amp; run workshops.</p>",
      salaryRange: "  $140,000 - $180,000 / year ",
      employmentType: " Full-time ",
    });

    assert.equal(normalized.notes, "Build storage systems & run workshops.");
    assert.equal(normalized.salaryRange, "$140,000 - $180,000 / year");
    assert.equal(normalized.employmentType, "Full-time");
  });
});
