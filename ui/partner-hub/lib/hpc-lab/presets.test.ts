import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_HPC_LAB_SIMULATION_OPTIONS } from "./config";
import { getHpcLabPresetSimulationOptions, HPC_LAB_PRESETS } from "./presets";

test("HPC Lab exposes exactly the Phase 1 preset ids", () => {
  assert.deepEqual(
    HPC_LAB_PRESETS.map((preset) => preset.id),
    ["classic-hpc", "ai-training", "small-file"],
  );
});

test("every preset has non-empty name and description", () => {
  for (const preset of HPC_LAB_PRESETS) {
    assert.ok(preset.name.trim().length > 0);
    assert.ok(preset.description.trim().length > 0);
  }
});

test("numeric defaults are finite and positive for required config fields", () => {
  for (const preset of HPC_LAB_PRESETS) {
    assert.ok(Number.isFinite(preset.initialConfig.computeNodes));
    assert.ok(preset.initialConfig.computeNodes > 0);

    assert.ok(Number.isFinite(preset.initialConfig.gpuNodes));
    assert.ok(preset.initialConfig.gpuNodes > 0);

    assert.ok(Number.isFinite(preset.initialConfig.ossCount));
    assert.ok(preset.initialConfig.ossCount > 0);

    assert.ok(Number.isFinite(preset.initialConfig.ostPerOss));
    assert.ok(preset.initialConfig.ostPerOss > 0);

    assert.ok(Number.isFinite(preset.initialConfig.stripeWidth));
    assert.ok(preset.initialConfig.stripeWidth > 0);

    assert.ok(Number.isFinite(preset.initialConfig.metadataLatencyMs));
    assert.ok(preset.initialConfig.metadataLatencyMs > 0);

    assert.ok(Number.isFinite(preset.initialConfig.networkBandwidthGbps));
    assert.ok(preset.initialConfig.networkBandwidthGbps > 0);

    assert.ok(Number.isFinite(preset.initialConfig.checkpointFrequencyMinutes));
    assert.ok(preset.initialConfig.checkpointFrequencyMinutes > 0);

    assert.ok(Number.isFinite(preset.initialConfig.concurrentJobs));
    assert.ok(preset.initialConfig.concurrentJobs > 0);
  }
});

test("preset simulation defaults merge with engine defaults", () => {
  for (const preset of HPC_LAB_PRESETS) {
    const options = getHpcLabPresetSimulationOptions(preset);
    assert.ok(options.totalTicks >= DEFAULT_HPC_LAB_SIMULATION_OPTIONS.totalTicks);
    assert.ok(options.tickDurationSeconds > 0);
  }
});
