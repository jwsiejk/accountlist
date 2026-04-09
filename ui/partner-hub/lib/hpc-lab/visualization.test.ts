import assert from "node:assert/strict";
import test from "node:test";

import { simulateHpcLab } from "./engine";
import { HPC_LAB_PRESETS } from "./presets";
import {
  buildCheckpointActiveJobsStats,
  buildCheckpointChartModel,
  buildConstraintSignalsChartModel,
  buildMetadataChartModel,
  buildMetadataUtilizationStats,
  buildOstLoadDistributionChartModel,
  buildThroughputChartModel,
  buildTopologyModel,
  downsampleTimelineDeterministic,
} from "./visualization";

test("topology model reflects normalized config", () => {
  const result = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, stripeWidth: 400 }, { totalTicks: 10 });
  const topology = buildTopologyModel(result);

  assert.equal(topology.cpuNodes, result.normalizedConfig.computeNodes);
  assert.equal(topology.gpuNodes, result.normalizedConfig.gpuNodes);
  assert.equal(topology.totalOsts, result.normalizedConfig.totalOsts);
  assert.equal(topology.effectiveStripeWidth, result.normalizedConfig.effectiveStripeWidth);
});

test("average OST load distribution length matches total OST count", () => {
  const result = simulateHpcLab(HPC_LAB_PRESETS[1].initialConfig, { totalTicks: 16 });
  const distribution = buildOstLoadDistributionChartModel(result);

  assert.equal(distribution.bars.length, result.normalizedConfig.totalOsts);
});

test("throughput series is deterministic from known result", () => {
  const result = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 6 }, { totalTicks: 12 });
  const first = buildThroughputChartModel(result, 200);
  const second = buildThroughputChartModel(result, 200);

  assert.deepEqual(first, second);
  assert.equal(first.series[0].points[0].value, result.timeline[0].requestedReadGbps + result.timeline[0].requestedWriteGbps);
  assert.equal(first.series[1].points[0].value, result.timeline[0].deliveredReadGbps + result.timeline[0].deliveredWriteGbps);
});

test("downsampling is deterministic and preserves first/last ticks", () => {
  const result = simulateHpcLab(HPC_LAB_PRESETS[2].initialConfig, { totalTicks: 240 });

  const first = downsampleTimelineDeterministic(result.timeline, 40);
  const second = downsampleTimelineDeterministic(result.timeline, 40);

  assert.deepEqual(first, second);
  assert.equal(first.sampled[0].tick, result.timeline[0].tick);
  assert.equal(first.sampled[first.sampled.length - 1].tick, result.timeline[result.timeline.length - 1].tick);
});

test("raw constraint signal series are generated for bottleneck panel", () => {
  const result = simulateHpcLab(HPC_LAB_PRESETS[1].initialConfig, { totalTicks: 24 });
  const model = buildConstraintSignalsChartModel(result, 24);

  assert.deepEqual(
    model.series.map((series) => series.key),
    ["compute-pressure", "storage-pressure", "metadata-pressure", "network-pressure"],
  );

  for (const series of model.series) {
    assert.equal(series.points.length, result.timeline.length);
  }
});

test("visualization layer only transforms existing run data", () => {
  const result = simulateHpcLab(HPC_LAB_PRESETS[0].initialConfig, { totalTicks: 18 });
  const throughput = buildThroughputChartModel(result, 18);
  const constraints = buildConstraintSignalsChartModel(result, 18);

  for (let index = 0; index < result.timeline.length; index += 1) {
    const tick = result.timeline[index];
    assert.equal(throughput.series[0].points[index].value, tick.requestedReadGbps + tick.requestedWriteGbps);
    assert.equal(throughput.series[1].points[index].value, tick.deliveredReadGbps + tick.deliveredWriteGbps);
    assert.equal(constraints.series[0].points[index].value, tick.constraintSignals.computePressure);
    assert.equal(constraints.series[1].points[index].value, tick.constraintSignals.storagePressure);
    assert.equal(constraints.series[2].points[index].value, tick.constraintSignals.metadataPressure);
    assert.equal(constraints.series[3].points[index].value, tick.constraintSignals.networkPressure);
  }
});

test("metadata chart keeps ops-only series and utilization is separate deterministic stats", () => {
  const result = simulateHpcLab(HPC_LAB_PRESETS[2].initialConfig, { totalTicks: 30 });
  const metadataChart = buildMetadataChartModel(result, 30);
  const metadataStats = buildMetadataUtilizationStats(result);

  assert.deepEqual(
    metadataChart.series.map((series) => series.key),
    ["metadata-requested", "metadata-served"],
  );
  assert.equal(metadataChart.valueFormat, "ops");
  assert.equal(metadataChart.yAxisLabel, "Ops/tick");

  const lastTick = result.timeline[result.timeline.length - 1];
  const expectedAverage = result.timeline.reduce((sum, tick) => sum + tick.metadataUtilization, 0) / result.timeline.length;
  const expectedPeak = result.timeline.reduce((max, tick) => Math.max(max, tick.metadataUtilization), 0);

  assert.equal(metadataStats.latest, lastTick.metadataUtilization);
  assert.equal(metadataStats.average, expectedAverage);
  assert.equal(metadataStats.peak, expectedPeak);
});

test("checkpoint panel keeps ratio-only line chart and separate active-job stats", () => {
  const result = simulateHpcLab(HPC_LAB_PRESETS[1].initialConfig, { totalTicks: 60 });
  const checkpointChart = buildCheckpointChartModel(result, 60);
  const checkpointStats = buildCheckpointActiveJobsStats(result);

  assert.deepEqual(
    checkpointChart.series.map((series) => series.key),
    ["checkpoint-pause-ratio"],
  );
  assert.equal(checkpointChart.valueFormat, "percent");
  assert.equal(checkpointChart.yAxisLabel, "Pause ratio");

  const lastTick = result.timeline[result.timeline.length - 1];
  const expectedAverage = result.timeline.reduce((sum, tick) => sum + tick.checkpointActiveJobs, 0) / result.timeline.length;
  const expectedPeak = result.timeline.reduce((max, tick) => Math.max(max, tick.checkpointActiveJobs), 0);

  assert.equal(checkpointStats.latest, lastTick.checkpointActiveJobs);
  assert.equal(checkpointStats.average, expectedAverage);
  assert.equal(checkpointStats.peak, expectedPeak);
});

test("downsampling returns stable empty output for empty timelines", () => {
  const sampled = downsampleTimelineDeterministic([], 20);

  assert.deepEqual(sampled, {
    sampled: [],
    downsampled: false,
  });
});

test("one-point run renders single point without downsampling", () => {
  const result = simulateHpcLab(HPC_LAB_PRESETS[0].initialConfig, { totalTicks: 1 });
  const throughput = buildThroughputChartModel(result, 120);

  assert.equal(throughput.downsampled, false);
  assert.equal(throughput.series.every((series) => series.points.length === 1), true);
});

test("OST distribution returns finite values for sparse/idle runs", () => {
  const idle = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 1 }, { totalTicks: 1 });
  const distribution = buildOstLoadDistributionChartModel(idle);

  assert.equal(distribution.bars.length, idle.normalizedConfig.totalOsts);
  assert.equal(distribution.bars.every((bar) => Number.isFinite(bar.value)), true);
});
