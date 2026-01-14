import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { buildCsv, escapeCsvValue } from "./csv";

describe("account mapping csv helpers", () => {
  it("escapes commas, quotes, and newlines", () => {
    assert.equal(escapeCsvValue("Simple"), "Simple");
    assert.equal(escapeCsvValue("Hello, world"), '"Hello, world"');
    assert.equal(escapeCsvValue('He said "hi"'), '"He said ""hi"""');
    assert.equal(escapeCsvValue("Line1\nLine2"), '"Line1\nLine2"');
  });

  it("builds a csv with headers and escaped values", () => {
    const csv = buildCsv(["name", "note"], [["ACME", "Hello, world"]]);
    assert.equal(csv, 'name,note\nACME,"Hello, world"');
  });
});
