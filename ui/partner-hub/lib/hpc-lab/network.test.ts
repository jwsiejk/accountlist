import assert from "node:assert/strict";
import test from "node:test";

import { simulateNetworkTick } from "./network";

test("lower network bandwidth reduces delivered throughput", () => {
  const high = simulateNetworkTick(80, 20, 200);
  const low = simulateNetworkTick(80, 20, 50);

  assert.equal(low.deliveredReadGbps + low.deliveredWriteGbps < high.deliveredReadGbps + high.deliveredWriteGbps, true);
});

test("network utilization is capped correctly", () => {
  const saturated = simulateNetworkTick(90, 40, 100);
  const unsaturated = simulateNetworkTick(20, 10, 100);

  assert.equal(saturated.networkUtilization <= 1, true);
  assert.equal(unsaturated.networkUtilization < 1, true);
});
