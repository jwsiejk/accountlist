import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import {
  buildBaseRows,
  buildOptionsFor,
  clearInvalidFilters,
  getEligibleRows,
  type MergedSearchFilterState,
} from "./mergedSearchFilters";
import type { MergedSearchRow } from "./mergedSearch";

describe("merged search cascading filters", () => {
  const rows: MergedSearchRow[] = [
    {
      vendor_account_name: "Vendor One",
      partner_account_name: "Partner One",
      vendor_owner: "Alice",
      partner_owner: "Bob",
      vendor_region: "West",
      partner_region: "East",
      vendor_organization: "OrgA",
      partner_organization: "OrgB",
      vendor_status: "Customer",
      partner_status: "Prospect",
    },
    {
      vendor_account_name: "Vendor Two",
      partner_account_name: "Partner Two",
      vendor_owner: "Alice",
      partner_owner: "Cara",
      vendor_region: "West",
      partner_region: "South",
      vendor_organization: "OrgA",
      partner_organization: "OrgC",
      vendor_status: "Prospect",
      partner_status: "Customer",
    },
    {
      vendor_account_name: "Vendor Three",
      partner_account_name: "",
      vendor_owner: "Dan",
      partner_owner: "",
      vendor_region: "North",
      partner_region: "",
      vendor_organization: "OrgD",
      partner_organization: "",
      vendor_status: "Customer",
      partner_status: "",
    },
  ];

  const baseFilters: MergedSearchFilterState = {
    vendorOwner: "Alice",
    partnerOwner: "",
    region: "South",
    organization: "",
    custProspect: "",
  };

  it("filters eligible rows while excluding one key", () => {
    const eligibleRows = getEligibleRows({
      rows,
      filters: baseFilters,
      excludeKey: "region",
    });
    assert.equal(eligibleRows.length, 2);
    assert.equal(eligibleRows[0].vendor_owner, "Alice");
  });

  it("builds cascading options with a first filter key", () => {
    const baseRows = buildBaseRows(rows, true);
    const options = buildOptionsFor({
      rows: baseRows,
      filters: baseFilters,
      firstFilterKey: "vendorOwner",
    });
    assert.deepEqual(options.vendorOwner, ["Alice"]);
    assert.deepEqual(options.region, ["East", "South", "West"]);
  });

  it("clears invalid selections based on options", () => {
    const options = {
      vendorOwner: ["Alice"],
      partnerOwner: ["Bob"],
      region: ["West"],
      organization: ["OrgA"],
      custProspect: ["Customer"],
    };
    const cleaned = clearInvalidFilters(
      {
        vendorOwner: "Dan",
        partnerOwner: "Bob",
        region: "East",
        organization: "OrgA",
        custProspect: "Prospect",
      },
      options,
    );
    assert.equal(cleaned.vendorOwner, "");
    assert.equal(cleaned.region, "");
    assert.equal(cleaned.custProspect, "");
  });
});
