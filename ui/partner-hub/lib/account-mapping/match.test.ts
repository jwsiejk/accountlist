import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { matchAccounts } from "./match";

describe("matchAccounts", () => {
  it("detects exact matches by normalized name", () => {
    const results = matchAccounts(
      [{ id: "a1", name: "Acme, Inc." }],
      [{ id: "b1", name: "Acme" }],
    );

    assert.equal(results[0].best?.matchType, "exact");
    assert.equal(results[0].best?.score, 100);
    assert.deepEqual(results[0].best?.reasons, ["same normalized name"]);
    assert.equal(results[0].status, "autoMatch");
  });

  it("scores strong and weak candidates within the same block", () => {
    const results = matchAccounts(
      [
        { id: "a1", name: "Wayne Enterprises" },
        { id: "a2", name: "Contoso Labs International" },
      ],
      [
        { id: "b1", name: "Wayne Enterprise" },
        { id: "b2", name: "Contoso Labs" },
      ],
    );

    assert.equal(results[0].best?.matchType, "strong");
    assert.equal(results[0].status, "autoMatch");

    assert.equal(results[1].best?.matchType, "exact");
    assert.equal(results[1].status, "autoMatch");
  });

  it("marks unmatched when scores fall below the review threshold", () => {
    const results = matchAccounts(
      [{ id: "a1", name: "Nonexistent Company" }],
      [{ id: "b1", name: "Different Brand" }],
    );

    assert.equal(results[0].best, null);
    assert.equal(results[0].status, "unmatched");
  });
});
