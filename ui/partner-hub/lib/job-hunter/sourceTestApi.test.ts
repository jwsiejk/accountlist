import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSourceTestStatus } from "./sourceTestApi";

describe("source test API semantics", () => {
  it("returns 200 for successful source tests", () => {
    const status = getSourceTestStatus({
      success: true,
      result: {
        sourceId: "greenhouse:acme",
        company: "Acme",
        provider: "greenhouse",
        token: "acme",
        success: true,
        jobsFetched: 2,
      },
    });

    assert.equal(status, 200);
  });

  it("returns 422 for failed source tests with structured diagnostics", () => {
    const status = getSourceTestStatus({
      success: false,
      result: {
        sourceId: "lever:bad",
        company: "Acme",
        provider: "lever",
        token: "bad",
        success: false,
        jobsFetched: 0,
        error: "bad token",
      },
    });

    assert.equal(status, 422);
  });

  it("returns 400 when payload is invalid", () => {
    const status = getSourceTestStatus({
      success: false,
      error: "Invalid source payload.",
    });

    assert.equal(status, 400);
  });
});
