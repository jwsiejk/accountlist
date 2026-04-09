import assert from "node:assert/strict";
import test from "node:test";

import { simulateHpcLab } from "./engine";
import { analyzeRunBottlenecks, classifyTickBottleneck } from "./bottlenecks";
import { HPC_LAB_PRESETS } from "./presets";

const allowedKinds = new Set(["compute", "storage", "metadata", "network", "mixed", "balanced"]);

test("classifyTickBottleneck returns balanced for low-signal ticks", () => {
  const attribution = classifyTickBottleneck(1, {
    computePressure: 0.1,
    storagePressure: 0.06,
    metadataPressure: 0.03,
    networkPressure: 0.08,
  });

  assert.equal(attribution.kind, "balanced");
});

test("classifyTickBottleneck returns mixed when top pressures are too close", () => {
  const attribution = classifyTickBottleneck(2, {
    computePressure: 0.62,
    storagePressure: 0.58,
    metadataPressure: 0.2,
    networkPressure: 0.19,
  });

  assert.equal(attribution.kind, "mixed");
});

test("classifyTickBottleneck returns dominant label when one signal clearly leads", () => {
  const attribution = classifyTickBottleneck(3, {
    computePressure: 0.9,
    storagePressure: 0.3,
    metadataPressure: 0.2,
    networkPressure: 0.1,
  });

  assert.equal(attribution.kind, "compute");
});

test("analyzeRunBottlenecks is deterministic for identical run input", () => {
  const run = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 20 }, { totalTicks: 100 });

  const first = analyzeRunBottlenecks(run);
  const second = analyzeRunBottlenecks(run);

  assert.deepEqual(first, second);
});

test("low-network-bandwidth scenario yields strong network share", () => {
  const run = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, networkBandwidthGbps: 25, concurrentJobs: 28 }, { totalTicks: 120 });
  const attribution = analyzeRunBottlenecks(run);

  assert.equal(attribution.timeShareByKind.network >= attribution.timeShareByKind.compute, true);
  assert.equal(attribution.timeShareByKind.network >= attribution.timeShareByKind.storage, true);
});

test("metadata-heavy high-latency scenario yields strong metadata share", () => {
  const run = simulateHpcLab(
    { ...HPC_LAB_PRESETS[2].initialConfig, metadataLatencyMs: 5.4, concurrentJobs: 72, networkBandwidthGbps: 180 },
    { totalTicks: 120 },
  );
  const attribution = analyzeRunBottlenecks(run);

  assert.equal(attribution.timeShareByKind.metadata >= attribution.timeShareByKind.compute, true);
  assert.equal(attribution.timeShareByKind.metadata >= attribution.timeShareByKind.network, true);
});

test("constrained-node scenario exhibits compute pressure and queue burden", () => {
  const run = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, computeNodes: 4, concurrentJobs: 20 }, { totalTicks: 80 });
  const attribution = analyzeRunBottlenecks(run);

  assert.equal(attribution.timeShareByKind.compute > 0, true);
  assert.equal(attribution.derivedMetrics.queueBurdenRatio > 0, true);
});

test("AI training with short checkpoint interval has checkpoint-active ticks", () => {
  const run = simulateHpcLab({ ...HPC_LAB_PRESETS[1].initialConfig, checkpointFrequencyMinutes: 0.08 }, { totalTicks: 80 });
  const attribution = analyzeRunBottlenecks(run);

  assert.equal(attribution.derivedMetrics.checkpointActiveTickShare > 0, true);
});

test("derived metrics are computed from timeline totals and counts", () => {
  const run = simulateHpcLab({ ...HPC_LAB_PRESETS[1].initialConfig, concurrentJobs: 10 }, { totalTicks: 90 });
  const attribution = analyzeRunBottlenecks(run);

  const requestedThroughput = run.timeline.reduce((sum, tick) => sum + tick.requestedReadGbps + tick.requestedWriteGbps, 0);
  const deliveredThroughput = run.timeline.reduce((sum, tick) => sum + tick.deliveredReadGbps + tick.deliveredWriteGbps, 0);
  const requestedMetadata = run.timeline.reduce((sum, tick) => sum + tick.metadataOpsRequested, 0);
  const servedMetadata = run.timeline.reduce((sum, tick) => sum + tick.metadataOpsServed, 0);
  const queueTicks = run.timeline.filter((tick) => tick.queuedJobs > 0).length;
  const checkpointTicks = run.timeline.filter((tick) => tick.checkpointActiveJobs > 0).length;

  assert.equal(attribution.derivedMetrics.throughputFulfillmentRatio, deliveredThroughput / requestedThroughput);
  assert.equal(attribution.derivedMetrics.metadataServiceRatio, servedMetadata / requestedMetadata);
  assert.equal(attribution.derivedMetrics.queueBurdenRatio, queueTicks / run.timeline.length);
  assert.equal(attribution.derivedMetrics.checkpointActiveTickShare, checkpointTicks / run.timeline.length);
});

test("analysis always returns non-empty explanation and next steps with allowed labels", () => {
  const run = simulateHpcLab(HPC_LAB_PRESETS[0].initialConfig, { totalTicks: 60 });
  const attribution = analyzeRunBottlenecks(run);

  assert.equal(attribution.explanation.trim().length > 0, true);
  assert.equal(attribution.nextSteps.length >= 2, true);
  assert.equal(attribution.nextSteps.every((step) => step.trim().length > 0), true);
  assert.equal(allowedKinds.has(attribution.dominantKind), true);
  assert.equal(attribution.perTick.every((tick) => allowedKinds.has(tick.kind)), true);
});

test("balanced low-signal runs return stable non-empty balanced attribution", () => {
  const run = simulateHpcLab(
    {
      ...HPC_LAB_PRESETS[0].initialConfig,
      concurrentJobs: 1,
      computeNodes: 512,
      gpuNodes: 256,
      ossCount: 64,
      ostPerOss: 16,
      networkBandwidthGbps: 1200,
      metadataLatencyMs: 0.5,
    },
    { totalTicks: 60 },
  );
  const attribution = analyzeRunBottlenecks(run);

  assert.equal(attribution.dominantKind, "balanced");
  assert.equal(attribution.explanation.trim().length > 0, true);
  assert.equal(attribution.nextSteps.length > 0, true);
});

test("mixed runs with frequent transitions remain stable and finite", () => {
  const run = simulateHpcLab(
    {
      ...HPC_LAB_PRESETS[1].initialConfig,
      concurrentJobs: 40,
      computeNodes: 10,
      gpuNodes: 10,
      networkBandwidthGbps: 55,
      metadataLatencyMs: 5.8,
      checkpointFrequencyMinutes: 0.04,
    },
    { totalTicks: 200 },
  );
  const attribution = analyzeRunBottlenecks(run);

  assert.equal(Number.isFinite(attribution.confidenceScore), true);
  assert.equal(Number.isFinite(attribution.derivedMetrics.throughputFulfillmentRatio), true);
  assert.equal(Number.isFinite(attribution.derivedMetrics.metadataServiceRatio), true);
  assert.equal(Number.isFinite(attribution.derivedMetrics.queueBurdenRatio), true);
  assert.equal(Number.isFinite(attribution.derivedMetrics.checkpointActiveTickShare), true);
  assert.equal(attribution.nextSteps.length > 0, true);
  assert.equal(attribution.bottleneckTransitionCount >= 0, true);
});
