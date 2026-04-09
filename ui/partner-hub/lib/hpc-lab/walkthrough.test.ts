import assert from "node:assert/strict";
import test from "node:test";

import { analyzeRunBottlenecks } from "./bottlenecks";
import { simulateHpcLab } from "./engine";
import { getHpcLabPresetById } from "./presets";
import { buildGuidedWalkthrough } from "./walkthrough";

const requirePreset = (id: "classic-hpc" | "ai-training" | "small-file") => {
  const preset = getHpcLabPresetById(id);
  if (!preset) {
    throw new Error(`Missing preset: ${id}`);
  }
  return preset;
};

test("metadata-bound run walkthrough explains metadata limits and proposes metadata experiments", () => {
  const preset = requirePreset("small-file");
  const result = simulateHpcLab(
    { ...preset.initialConfig, metadataLatencyMs: 6, concurrentJobs: 72, networkBandwidthGbps: 220 },
    { totalTicks: 140 },
  );
  const attribution = analyzeRunBottlenecks(result);
  const walkthrough = buildGuidedWalkthrough(preset, result, attribution);

  assert.equal(walkthrough.headline.trim().length > 0, true);
  assert.equal(walkthrough.whyItHappened.toLowerCase().includes("metadata"), true);
  assert.equal(walkthrough.evidence.some((item) => item.metric === "metadata-service-ratio" && item.value === attribution.derivedMetrics.metadataServiceRatio), true);
  assert.equal(walkthrough.evidence.some((item) => item.metric === "avg-wait-on-data-ratio" && item.value === result.summary.avgWaitOnDataRatio), true);
  assert.equal(walkthrough.nextExperiments.some((item) => item.change.toLowerCase().includes("metadatalatencyms")), true);
  assert.equal(walkthrough.environmentContext.toLowerCase().includes("shared"), true);
});

test("no-jobs-completed with partial progress is framed as informative, not total failure", () => {
  const preset = requirePreset("classic-hpc");
  const result = simulateHpcLab({ ...preset.initialConfig, concurrentJobs: 32 }, { totalTicks: 8 });
  const attribution = analyzeRunBottlenecks(result);
  const walkthrough = buildGuidedWalkthrough(preset, result, attribution);

  assert.equal(result.summary.totalCompletedJobs, 0);
  assert.equal(result.summary.avgCompletedWorkRatio > 0, true);
  assert.equal(walkthrough.whatHappened.toLowerCase().includes("progress"), true);
  assert.equal(walkthrough.whatHappened.toLowerCase().includes("total failure"), false);

  if (result.summary.avgCompletedWorkRatio > 0.2) {
    assert.equal(walkthrough.nextExperiments.some((item) => item.change.includes("totalTicks")), true);
  }
});

test("compute-pressure run references queue burden and compute admission pressure", () => {
  const preset = requirePreset("classic-hpc");
  const result = simulateHpcLab({ ...preset.initialConfig, computeNodes: 4, gpuNodes: 2, concurrentJobs: 28 }, { totalTicks: 90 });
  const attribution = analyzeRunBottlenecks(result);
  const walkthrough = buildGuidedWalkthrough(preset, result, attribution);

  assert.equal(attribution.derivedMetrics.queueBurdenRatio > 0, true);
  assert.equal(walkthrough.whyItHappened.toLowerCase().includes("queue"), true);
  assert.equal(walkthrough.evidence.some((item) => item.metric === "queue-burden-ratio" && item.value === attribution.derivedMetrics.queueBurdenRatio), true);
});

test("mixed or balanced runs stay conservative while still giving next steps", () => {
  const preset = requirePreset("classic-hpc");
  const result = simulateHpcLab(
    {
      ...preset.initialConfig,
      concurrentJobs: 1,
      computeNodes: 512,
      gpuNodes: 256,
      ossCount: 64,
      ostPerOss: 16,
      networkBandwidthGbps: 1200,
      metadataLatencyMs: 0.5,
    },
    { totalTicks: 80 },
  );
  const attribution = analyzeRunBottlenecks(result);
  const walkthrough = buildGuidedWalkthrough(preset, result, attribution);

  assert.equal(attribution.dominantKind === "mixed" || attribution.dominantKind === "balanced", true);
  assert.equal(walkthrough.whyItHappened.toLowerCase().includes("single") || walkthrough.whyItHappened.toLowerCase().includes("spread"), true);
  assert.equal(walkthrough.nextExperiments.length >= 2, true);
});

test("AI checkpoint-active runs explicitly reference checkpoint behavior", () => {
  const preset = requirePreset("ai-training");
  const result = simulateHpcLab({ ...preset.initialConfig, checkpointFrequencyMinutes: 0.05, concurrentJobs: 12 }, { totalTicks: 160 });
  const attribution = analyzeRunBottlenecks(result);
  const walkthrough = buildGuidedWalkthrough(preset, result, attribution);

  assert.equal(attribution.derivedMetrics.checkpointActiveTickShare > 0.12, true);
  assert.equal(walkthrough.whatToLearn.toLowerCase().includes("checkpoint"), true);
  assert.equal(walkthrough.evidence.some((item) => item.metric === "checkpoint-active-tick-share" && item.value === attribution.derivedMetrics.checkpointActiveTickShare), true);
});

test("walkthrough generation is deterministic for identical inputs", () => {
  const preset = requirePreset("small-file");
  const result = simulateHpcLab({ ...preset.initialConfig, metadataLatencyMs: 3.8, concurrentJobs: 68 }, { totalTicks: 100 });
  const attribution = analyzeRunBottlenecks(result);

  const first = buildGuidedWalkthrough(preset, result, attribution);
  const second = buildGuidedWalkthrough(preset, result, attribution);

  assert.deepEqual(first, second);
});

test("walkthrough evidence values are sourced from run and attribution metrics", () => {
  const preset = requirePreset("classic-hpc");
  const result = simulateHpcLab({ ...preset.initialConfig, concurrentJobs: 20 }, { totalTicks: 70 });
  const attribution = analyzeRunBottlenecks(result);
  const walkthrough = buildGuidedWalkthrough(preset, result, attribution);

  const evidenceByMetric = Object.fromEntries(walkthrough.evidence.map((item) => [item.metric, item.value]));

  assert.equal(evidenceByMetric["total-completed-jobs"], result.summary.totalCompletedJobs);
  assert.equal(evidenceByMetric["avg-completed-work-ratio"], result.summary.avgCompletedWorkRatio);
  assert.equal(evidenceByMetric["queue-burden-ratio"], attribution.derivedMetrics.queueBurdenRatio);
  assert.equal(evidenceByMetric["throughput-fulfillment-ratio"], attribution.derivedMetrics.throughputFulfillmentRatio);
  assert.equal(evidenceByMetric["metadata-service-ratio"], attribution.derivedMetrics.metadataServiceRatio);
  assert.equal(evidenceByMetric["avg-wait-on-data-ratio"], result.summary.avgWaitOnDataRatio);
  assert.equal(evidenceByMetric["checkpoint-active-tick-share"], attribution.derivedMetrics.checkpointActiveTickShare);
  assert.equal(evidenceByMetric["dominant-time-share"], attribution.dominantTimeShare);
  assert.equal(evidenceByMetric["bottleneck-transition-count"], attribution.bottleneckTransitionCount);
  assert.equal(evidenceByMetric["longest-dominant-streak"], attribution.longestDominantStreak);
});
