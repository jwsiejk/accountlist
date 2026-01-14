import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { filterMergedSearchRows, type MergedSearchRow } from "./mergedSearch";

describe("merged search filters", () => {
  const rows: MergedSearchRow[] = [
    {
      vendor_account_name: "Acme Corp",
      partner_account_name: "Zenith Co",
      vendor_owner: "Jane Doe",
      partner_owner: "John Doe",
      match_type: "name",
      match_score: "94",
      match_reasons: "normalized",
      decision_status: "confirmed",
      normalized_name: "acme corp",
    },
    {
      vendor_account_name: "Globex",
      partner_account_name: "",
      vendor_owner: "Sam Smith",
      partner_owner: "",
      match_type: "",
      match_score: "",
      match_reasons: "",
      decision_status: "unmatched",
      normalized_name: "globex",
    },
  ];

  it("filters by global search across fields", () => {
    const filtered = filterMergedSearchRows(rows, {
      search: "zenith",
      vendorOwner: "",
      partnerOwner: "",
      matchType: "",
      overlapOnly: false,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].vendor_account_name, "Acme Corp");
  });

  it("respects overlapOnly by removing unmatched rows", () => {
    const filtered = filterMergedSearchRows(rows, {
      search: "",
      vendorOwner: "",
      partnerOwner: "",
      matchType: "",
      overlapOnly: true,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].vendor_account_name, "Acme Corp");
  });
});
