import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  applyDecisionsToRows,
  buildDecisionKey,
  deserializeDecisions,
  serializeDecisions,
  type MappingDecision,
} from "./decisionStore";

describe("decision store", () => {
  it("serializes and deserializes decisions", () => {
    const decisions: MappingDecision[] = [
      {
        key: buildDecisionKey("vendor-1", "partner-1", "acme"),
        vendorAccountKey: "vendor-1",
        partnerAccountKey: "partner-1",
        normalizedName: "acme",
        decision: "confirmed",
        updatedAt: "2024-02-01T12:00:00.000Z",
      },
    ];

    const serialized = serializeDecisions(decisions);
    const parsed = deserializeDecisions(serialized);

    assert.deepEqual(parsed, decisions);
  });

  it("applies the latest decision to rows", () => {
    const rows = [
      {
        vendorAccountKey: "vendor-1",
        normalizedName: "acme",
        partnerAccountKey: "partner-1",
        status: "review" as const,
      },
    ];

    const decisions: MappingDecision[] = [
      {
        key: buildDecisionKey("vendor-1", "partner-1", "acme"),
        vendorAccountKey: "vendor-1",
        partnerAccountKey: "partner-1",
        normalizedName: "acme",
        decision: "rejected",
        updatedAt: "2024-02-01T12:00:00.000Z",
      },
      {
        key: buildDecisionKey("vendor-1", "partner-2", "acme"),
        vendorAccountKey: "vendor-1",
        partnerAccountKey: "partner-2",
        normalizedName: "acme",
        decision: "manual",
        updatedAt: "2024-02-02T12:00:00.000Z",
      },
    ];

    const updated = applyDecisionsToRows(rows, decisions);

    assert.equal(updated[0].status, "manual");
    assert.equal(updated[0].partnerAccountKey, "partner-2");
  });
});
