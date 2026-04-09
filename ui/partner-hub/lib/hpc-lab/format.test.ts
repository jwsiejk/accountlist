import assert from "node:assert/strict";
import test from "node:test";

import { formatCount, formatDecimal, formatGbps, formatOps, formatPercent } from "./format";

test("format helpers produce stable formatted values for finite inputs", () => {
  assert.equal(formatPercent(0.125), "12.5%");
  assert.equal(formatGbps(18.234), "18.23 Gbps");
  assert.equal(formatOps(1200.2), "1200 ops");
  assert.equal(formatCount(4.8), "5");
  assert.equal(formatDecimal(1.2345, 3), "1.234");
});

test("format helpers return fallback for NaN and Infinity values", () => {
  assert.equal(formatPercent(Number.NaN), "—");
  assert.equal(formatGbps(Number.POSITIVE_INFINITY), "—");
  assert.equal(formatOps(Number.NEGATIVE_INFINITY), "—");
  assert.equal(formatCount(Number.NaN), "—");
  assert.equal(formatDecimal(Number.NaN), "—");
});
