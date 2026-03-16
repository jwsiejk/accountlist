import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseBulkSourceInput, toUserFacingSourceError } from "./sourceSettings";

describe("job hunter source settings helpers", () => {
  it("parses bulk source entries from company|token lines", () => {
    const parsed = parseBulkSourceInput("Acme|acme\nBeta|beta\nBadLine", "greenhouse");

    assert.equal(parsed.length, 2);
    assert.deepEqual(parsed[0], { company: "Acme", boardType: "greenhouse", boardToken: "acme" });
  });

  it("sanitizes raw parser errors for source testing", () => {
    assert.equal(
      toUserFacingSourceError("Unexpected token '<', \"<!doctype \"... is not valid JSON"),
      "The source response was not readable. Please verify the URL or try another source.",
    );
  });
});
