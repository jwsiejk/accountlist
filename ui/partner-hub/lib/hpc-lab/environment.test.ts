import assert from "node:assert/strict";
import test from "node:test";

import { analyzeRunBottlenecks } from "./bottlenecks";
import { simulateHpcLab } from "./engine";
import { buildEnvironmentResultContext, getHpcLabEnvironmentProfile } from "./environment";
import { HPC_LAB_PRESETS } from "./presets";
import { buildGuidedWalkthrough } from "./walkthrough";

const requirePreset = (id: "classic-hpc" | "ai-training" | "small-file") => {
  const preset = HPC_LAB_PRESETS.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Missing preset: ${id}`);
  }
  return preset;
};

test("default higher-ed profile includes required storage tiers and metadata/data layers", () => {
  const profile = getHpcLabEnvironmentProfile();

  assert.equal(profile.tiers.some((tier) => tier.id === "node-local-scratch"), true);
  assert.equal(profile.tiers.some((tier) => tier.id === "shared-scratch"), true);
  assert.equal(profile.tiers.some((tier) => tier.id === "long-lived-storage"), true);

  assert.equal(profile.stackLayers.some((layer) => layer.id === "shared-filesystem-metadata"), true);
  assert.equal(profile.stackLayers.some((layer) => layer.id === "shared-filesystem-data"), true);
});

test("environment profile is explicit about what is simulated versus conceptual", () => {
  const profile = getHpcLabEnvironmentProfile();

  assert.equal(profile.whatTheSimulatorModels.length > 0, true);
  assert.equal(profile.whatTheSimulatorDoesNotModel.length > 0, true);
  assert.equal(profile.stackLayers.some((layer) => layer.id === "local-scratch" && !layer.simulatedToday), true);
  assert.equal(profile.stackLayers.some((layer) => layer.id === "shared-filesystem-data" && layer.simulatedToday), true);
});

test("each preset has non-empty environment-aware guidance", () => {
  for (const preset of HPC_LAB_PRESETS) {
    assert.equal(preset.learningGuidance.environmentGuidance.trim().length > 0, true);
  }
});

test("environment context and walkthrough output are deterministic for identical inputs", () => {
  const preset = requirePreset("small-file");
  const result = simulateHpcLab({ ...preset.initialConfig, concurrentJobs: 66, metadataLatencyMs: 3.7 }, { totalTicks: 110 });
  const attribution = analyzeRunBottlenecks(result);

  const envFirst = buildEnvironmentResultContext(attribution);
  const envSecond = buildEnvironmentResultContext(attribution);
  assert.equal(envFirst, envSecond);

  const firstWalkthrough = buildGuidedWalkthrough(preset, result, attribution);
  const secondWalkthrough = buildGuidedWalkthrough(preset, result, attribution);

  assert.deepEqual(firstWalkthrough, secondWalkthrough);
  assert.equal(firstWalkthrough.environmentContext, envFirst);
});
