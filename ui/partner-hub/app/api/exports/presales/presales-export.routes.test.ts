import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { POST as pdfPost } from "./pdf/route";
import { POST as pptxPost } from "./pptx/route";

const samplePayload = {
  meta: {
    toolName: "Energy Tool",
    generatedAt: "2024-01-01T00:00:00Z",
    viewMode: "energy",
    dataset: null,
  },
  assumptions: {
    flashblade: {
      utilizationPct: 50,
      pue: 1.35,
      pricePerKwh: 0.12,
      drr: 2,
      dfmSizeTb: 48,
      capacityPb: 4,
    },
    netapp: {
      utilizationPct: 50,
      pue: 1.35,
      pricePerKwh: 0.12,
      overheadRawToUsable: 0.2,
      drr: 1.3,
      driveSizeTb: 18,
      driveSizeSelection: "Compatibility dataset (all drives)",
    },
    sustainability: {
      gridKgCo2ePerKwh: 0.4,
      gridFactorSource: "default",
    },
  },
  selection: {
    mode: "auto",
    selectedNetAppConfig: {
      controllerModel: "E2800",
      expansionModel: "DE460C 60-bay",
      expansionQty: 2,
      driveSizeTb: 18,
      rackUnits: 12,
      effectiveTb: 400,
      kwhPerYear: 100000,
      annualCost: 12000,
      summary: "E2800 + 2 shelves",
    },
    matchInfo: {
      tolerancePct: 10,
      candidateCount: 4,
      selectedIndex: 0,
    },
  },
  results: {
    flashbladeTotals: {
      effectiveTb: 450,
      weightedW: 5000,
      kwhPerYear: 120000,
      annualCost: 15000,
      btuPerHour: 17000,
      rackUnits: 20,
      co2eKgPerYear: 48000,
      co2ePerTbYear: 106,
    },
    netappTotals: {
      effectiveTb: 400,
      weightedW: 4500,
      kwhPerYear: 100000,
      annualCost: 12000,
      btuPerHour: null,
      rackUnits: 12,
      co2eKgPerYear: 40000,
      co2ePerTbYear: 100,
    },
    deltaTotals: {
      effectiveTb: 50,
      weightedW: 500,
      kwhPerYear: 20000,
      annualCost: 3000,
      btuPerHour: null,
      rackUnits: 8,
      co2eKgPerYear: 8000,
      co2ePerTbYear: 6,
    },
  },
  rows: [
    {
      key: "effectiveTb",
      label: "Effective TB",
      flashblade: "450",
      netapp: "400",
      delta: "50",
      units: "TB",
    },
  ],
  sources: [{ label: "https://example.com", url: "https://example.com", missing: false }],
};

describe("presales export routes", () => {
  it("returns a PDF buffer", async () => {
    const response = await pdfPost(
      new Request("http://localhost/api/exports/presales/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplePayload),
      }),
    );
    assert.equal(response.status, 200);
    const buffer = Buffer.from(await response.arrayBuffer());
    assert.ok(buffer.length > 0);
  });

  it("returns a PPTX buffer", async () => {
    const response = await pptxPost(
      new Request("http://localhost/api/exports/presales/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplePayload),
      }),
    );
    assert.equal(response.status, 200);
    const buffer = Buffer.from(await response.arrayBuffer());
    assert.ok(buffer.length > 0);
  });
});
