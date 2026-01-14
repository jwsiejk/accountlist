import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { blockingKey, normalizeName } from "./normalize";

describe("normalizeName", () => {
  it("normalizes punctuation, casing, and legal suffixes", () => {
    assert.equal(normalizeName("Acme, Inc."), "acme");
    assert.equal(normalizeName("  ACME Holdings, LLC  "), "acme");
    assert.equal(normalizeName("Foo-Bar Co."), "foo bar");
    assert.equal(normalizeName("R&D Group PLC"), "rd");
  });

  it("collapses whitespace and removes trailing legal suffixes", () => {
    assert.equal(normalizeName("The Example Company Ltd"), "the example");
  });
});

describe("blockingKey", () => {
  it("combines the first token with a prefix", () => {
    assert.equal(blockingKey("acme widgets"), "acme:acme w");
  });
});
