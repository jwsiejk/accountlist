import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHpcLabConfig } from "./config";
import { HPC_LAB_PRESETS } from "./presets";

test("normalizeHpcLabConfig normalizes integer counts and derives totals", () => {
  const normalized = normalizeHpcLabConfig({
    ...HPC_LAB_PRESETS[0].initialConfig,
    computeNodes: 96.8,
    gpuNodes: 7.9,
    ossCount: 12.9,
    ostPerOss: 8.4,
    stripeWidth: 9.9,
    concurrentJobs: 24.1,
  });

  assert.equal(normalized.computeNodes, 96);
  assert.equal(normalized.gpuNodes, 7);
  assert.equal(normalized.ossCount, 12);
  assert.equal(normalized.ostPerOss, 8);
  assert.equal(normalized.stripeWidth, 9);
  assert.equal(normalized.concurrentJobs, 24);
  assert.equal(normalized.totalOsts, 96);
  assert.equal(normalized.effectiveStripeWidth, 9);
});

test("normalizeHpcLabConfig clamps effective stripe width to total OST count", () => {
  const normalized = normalizeHpcLabConfig({
    ...HPC_LAB_PRESETS[0].initialConfig,
    ossCount: 2,
    ostPerOss: 2,
    stripeWidth: 64,
  });

  assert.equal(normalized.totalOsts, 4);
  assert.equal(normalized.effectiveStripeWidth, 4);
});

test("normalizeHpcLabConfig preserves valid preset-derived values", () => {
  const presetConfig = HPC_LAB_PRESETS[1].initialConfig;
  const normalized = normalizeHpcLabConfig(presetConfig);

  assert.equal(normalized.computeNodes, presetConfig.computeNodes);
  assert.equal(normalized.gpuNodes, presetConfig.gpuNodes);
  assert.equal(normalized.stripeWidth, presetConfig.stripeWidth);
  assert.equal(normalized.concurrentJobs, presetConfig.concurrentJobs);
});
