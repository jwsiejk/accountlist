import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { buildNetAppCandidate, enumerateNetApp, fbPower, type NetAppRow, type PureRow } from "./energy-calc";

const makePureRows = (): PureRow[] => [
  {
    Model: "FB EC chassis 1",
    DFM_Size_TB: 48,
    Typical_W: 100,
    Idle_W: 50,
    Min_Usable_PB: 4,
    Capacity_Increment_PB: 1,
    Min_EC_Chassis: 2,
    Min_EX_Chassis: 1,
    Min_XFMs: 2,
    Max_Total_Chassis: 10,
    Rack_Units: 7,
  },
  {
    Model: "FB EX chassis 1",
    DFM_Size_TB: 48,
    Typical_W: 80,
    Idle_W: 40,
    Min_Usable_PB: 4,
    Capacity_Increment_PB: 1,
    Min_EC_Chassis: 2,
    Min_EX_Chassis: 1,
    Min_XFMs: 2,
    Max_Total_Chassis: 10,
    Rack_Units: 4,
  },
  {
    Model: "FB XFM",
    DFM_Size_TB: 48,
    Typical_W: 20,
    Idle_W: 10,
    Min_Usable_PB: 4,
    Capacity_Increment_PB: 1,
    Min_EC_Chassis: 2,
    Min_EX_Chassis: 1,
    Min_XFMs: 2,
    Max_Total_Chassis: 10,
    Rack_Units: 2,
  },
];

const makeNetAppRows = (): NetAppRow[] => [
  {
    Component_Type: "Controller_Shelf",
    Model: "C1",
    Typical_W: 200,
    Idle_W: 100,
    Drives_per_unit: 24,
    Rack_Units: 4,
  },
  {
    Component_Type: "Expansion_Shelf",
    Model: "DE460C 60-bay",
    Typical_W: 150,
    Idle_W: 75,
    Drives_per_unit: 60,
    Rack_Units: 4,
  },
];

describe("fbPower", () => {
  it("computes rack units and preserves energy outputs", () => {
    const result = fbPower(makePureRows(), 48, 5, 0.5, 1.2, 0.1, 2);

    assert.equal(result.ecQty, 2);
    assert.equal(result.exQty, 2);
    assert.equal(result.xfmQty, 2);
    assert.equal(result.rackUnits, 26);
    assert.deepEqual(
      {
        weightedW: result.weightedW,
        kwhIt: result.kwhIt,
        kwhWithPue: result.kwhWithPue,
        annualCost: result.annualCost,
      },
      {
        weightedW: 300,
        kwhIt: 2628,
        kwhWithPue: 3153.6,
        annualCost: 315.36,
      },
    );
    assert.ok(Math.abs(result.btuPerHour - 1023.6) < 1e-6);
    assert.ok(Math.abs(result.effectiveTb - 10000) < 1e-6);
  });

  it("returns null rack units when any component is missing RU", () => {
    const rows = makePureRows();
    rows[2] = { ...rows[2], Rack_Units: null };
    const result = fbPower(rows, 48, 5, 0.5, 1.2, 0.1, 2);
    assert.equal(result.rackUnits, null);
    assert.ok(Math.abs(result.weightedW - 300) < 1e-6);
  });
});

describe("NetApp candidates", () => {
  it("computes rack units in buildNetAppCandidate", () => {
    const candidate = buildNetAppCandidate(makeNetAppRows(), "C1", "DE460C 60-bay", 2, 0.5, 1.2, 0.1, 0.2, 1.3, 18);

    assert.equal(candidate.rackUnits, 12);
    assert.ok(Math.abs(candidate.weightedW - 375) < 1e-6);
    assert.ok(Math.abs(candidate.kwhYearWithPue - 3942) < 1e-6);
    assert.ok(Math.abs(candidate.annualEnergyCost - 394.2) < 1e-6);
    assert.ok(Math.abs(candidate.effectiveTb - 2695.68) < 1e-6);
  });

  it("returns null rack units when any NetApp RU input is missing", () => {
    const rows = makeNetAppRows();
    rows[0] = { ...rows[0], Rack_Units: null };
    const candidate = buildNetAppCandidate(rows, "C1", "DE460C 60-bay", 2, 0.5, 1.2, 0.1, 0.2, 1.3, 18);
    assert.equal(candidate.rackUnits, null);
    assert.ok(Math.abs(candidate.weightedW - 375) < 1e-6);
  });

  it("computes rack units in enumerateNetApp", () => {
    const targetEffTb = 2695.68;
    const candidates = enumerateNetApp(makeNetAppRows(), targetEffTb, 0.5, 1.2, 0.1, 0.2, 1.3, 18, 0.5);
    const match = candidates.find((candidate) => candidate.expansionQty === 2);

    assert.ok(match);
    assert.equal(match?.rackUnits, 12);
    assert.ok(Math.abs((match?.weightedW ?? 0) - 375) < 1e-6);
    assert.ok(Math.abs((match?.kwhYearWithPue ?? 0) - 3942) < 1e-6);
    assert.ok(Math.abs((match?.annualEnergyCost ?? 0) - 394.2) < 1e-6);
  });
});
