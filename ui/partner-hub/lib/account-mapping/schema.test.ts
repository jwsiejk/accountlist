import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { createEmptyRawMapping, normalizeMapping, validateMapping } from "./schema";

describe("account mapping schema", () => {
  it("requires account_name mapping", () => {
    const mapping = createEmptyRawMapping();
    mapping.owner_name = "Owner";

    const result = validateMapping(mapping);

    assert.equal(result.success, false);
  });

  it("accepts optional fields when account_name is mapped", () => {
    const mapping = createEmptyRawMapping();
    mapping.account_name = "Account Name";
    mapping.crm_account_id = "CRM ID";

    const result = validateMapping(mapping);

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, {
        ...normalizeMapping(mapping),
        account_name: "Account Name",
      });
    }
  });
});
