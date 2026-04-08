import assert from "node:assert/strict";
import test from "node:test";

import { simulateHpcLab } from "./engine";
import { HPC_LAB_PRESETS } from "./presets";
import {
  buildConstraintSignalsChartModel,
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
