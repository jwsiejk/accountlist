import assert from "node:assert/strict";
import test from "node:test";

import { simulateHpcLab } from "./engine";
import { HPC_LAB_PRESETS } from "./presets";

test("identical config and options produce identical simulation results", () => {
  const config = { ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 8 };
  const options = { totalTicks: 40, tickDurationSeconds: 1 };

  const first = simulateHpcLab(config, options);
  const second = simulateHpcLab(config, options);

  assert.deepEqual(first, second);
});

test("lower network bandwidth lowers achieved throughput for the same workload", () => {
  const base = { ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 12 };
  const high = simulateHpcLab({ ...base, networkBandwidthGbps: 300 }, { totalTicks: 30 });
  const low = simulateHpcLab({ ...base, networkBandwidthGbps: 40 }, { totalTicks: 30 });

  assert.equal(low.summary.avgDeliveredReadGbps + low.summary.avgDeliveredWriteGbps < high.summary.avgDeliveredReadGbps + high.summary.avgDeliveredWriteGbps, true);
});

test("higher metadata latency worsens metadata service for small-file behavior", () => {
  const base = { ...HPC_LAB_PRESETS[2].initialConfig, concurrentJobs: 16 };
  const fast = simulateHpcLab({ ...base, metadataLatencyMs: 1.2 }, { totalTicks: 30 });
  const slow = simulateHpcLab({ ...base, metadataLatencyMs: 4.2 }, { totalTicks: 30 });

  assert.equal(slow.summary.avgMetadataUtilization >= fast.summary.avgMetadataUtilization, true);
  assert.equal(slow.summary.avgWaitOnDataRatio >= fast.summary.avgWaitOnDataRatio, true);
});

test("AI training checkpoint intervals create visible write bursts and checkpoint pause impact", () => {
  const result = simulateHpcLab({ ...HPC_LAB_PRESETS[1].initialConfig, checkpointFrequencyMinutes: 0.05, concurrentJobs: 4 }, { totalTicks: 20 });

  const writes = result.timeline.map((tick) => tick.requestedWriteGbps);
  const maxWrite = Math.max(...writes);
  const minWrite = Math.min(...writes);
  const maxPause = Math.max(...result.timeline.map((tick) => tick.checkpointPauseRatio));

  assert.equal(maxWrite > minWrite, true);
  assert.equal(maxPause > 0, true);
});

test("insufficient nodes create queued jobs", () => {
  const result = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, computeNodes: 2, concurrentJobs: 12 }, { totalTicks: 15 });
  assert.equal(result.summary.peakQueuedJobs > 0, true);
});
