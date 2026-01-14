import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { inferMappingFromHeaders } from "./inference";

const headers = [
  "Account Name",
  "Owner",
  "Manager",
  "Status",
  "Segment",
  "City",
  "State",
  "Country",
  "Contact Email",
  "CRM Account ID",
];

describe("inferMappingFromHeaders", () => {
  it("maps common headers to canonical fields", () => {
    const mapping = inferMappingFromHeaders(headers);

    assert.equal(mapping.account_name, "Account Name");
    assert.equal(mapping.owner_name, "Owner");
    assert.equal(mapping.manager_name, "Manager");
    assert.equal(mapping.status, "Status");
    assert.equal(mapping.segment_type, "Segment");
    assert.equal(mapping.city, "City");
    assert.equal(mapping.state, "State");
    assert.equal(mapping.country, "Country");
    assert.equal(mapping.contacts, "Contact Email");
    assert.equal(mapping.crm_account_id, "CRM Account ID");
  });

  it("avoids mapping unknown headers", () => {
    const mapping = inferMappingFromHeaders(["Foo", "Bar"]);

    assert.equal(mapping.account_name, "");
    assert.equal(mapping.owner_name, "");
  });
});
