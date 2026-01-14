import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { mergedAccountExportSchema, targetExportSchema } from "./exportSchema";

describe("account mapping export schema", () => {
  it("validates merged account export rows", () => {
    const row = {
      vendor_account_name: "Acme Corp",
      partner_account_name: "Acme Ltd",
      vendor_owner: "Sam",
      vendor_manager: "Taylor",
      vendor_pam: "Riley",
      partner_owner: "Jordan",
      partner_manager: "Casey",
      partner_pam: "Morgan",
      vendor_status: "Customer",
      partner_status: "Prospect",
      match_score: "0.92",
      match_type: "exact",
      match_reasons: "normalized name",
    };

    assert.deepEqual(mergedAccountExportSchema.parse(row), row);
  });

  it("validates target list export rows", () => {
    const row = {
      vendor_account_name: "Globex",
      partner_account_name: "Globex Partner",
      vendor_status: "Prospect",
      partner_status: "Customer",
      match_score: "0.81",
      match_type: "fuzzy",
      match_reasons: "alias",
    };

    assert.deepEqual(targetExportSchema.parse(row), row);
  });
});
