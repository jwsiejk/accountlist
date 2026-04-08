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

test("lower network bandwidth lowers throughput and completed work over the same horizon", () => {
  const base = { ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 12 };
  const high = simulateHpcLab({ ...base, networkBandwidthGbps: 300 }, { totalTicks: 30 });
  const low = simulateHpcLab({ ...base, networkBandwidthGbps: 40 }, { totalTicks: 30 });

  const highWork = high.jobs.reduce((sum, job) => sum + job.completedWorkTicks, 0);
  const lowWork = low.jobs.reduce((sum, job) => sum + job.completedWorkTicks, 0);

  assert.equal(low.summary.avgDeliveredReadGbps + low.summary.avgDeliveredWriteGbps < high.summary.avgDeliveredReadGbps + high.summary.avgDeliveredWriteGbps, true);
  assert.equal(lowWork < highWork || low.summary.totalCompletedJobs < high.summary.totalCompletedJobs, true);
});

test("higher metadata latency worsens metadata-heavy completion behavior", () => {
  const base = { ...HPC_LAB_PRESETS[2].initialConfig, concurrentJobs: 16 };
  const fast = simulateHpcLab({ ...base, metadataLatencyMs: 1.2 }, { totalTicks: 30 });
  const slow = simulateHpcLab({ ...base, metadataLatencyMs: 4.2 }, { totalTicks: 30 });

  const fastWork = fast.jobs.reduce((sum, job) => sum + job.completedWorkTicks, 0);
  const slowWork = slow.jobs.reduce((sum, job) => sum + job.completedWorkTicks, 0);

  assert.equal(slow.summary.avgWaitOnDataRatio >= fast.summary.avgWaitOnDataRatio, true);
  assert.equal(slowWork < fastWork || slow.summary.totalCompletedJobs < fast.summary.totalCompletedJobs, true);
});

test("AI checkpoint intervals reduce useful progress while creating write bursts", () => {
  const base = { ...HPC_LAB_PRESETS[1].initialConfig, concurrentJobs: 4 };
  const frequent = simulateHpcLab({ ...base, checkpointFrequencyMinutes: 0.05 }, { totalTicks: 20 });
  const rare = simulateHpcLab({ ...base, checkpointFrequencyMinutes: 100 }, { totalTicks: 20 });

  const writes = frequent.timeline.map((tick) => tick.requestedWriteGbps);
  const maxWrite = Math.max(...writes);
  const minWrite = Math.min(...writes);
  const frequentWork = frequent.jobs.reduce((sum, job) => sum + job.completedWorkTicks, 0);
  const rareWork = rare.jobs.reduce((sum, job) => sum + job.completedWorkTicks, 0);

  assert.equal(maxWrite > minWrite, true);
  assert.equal(frequent.timeline.some((tick) => tick.checkpointPauseRatio > 0), true);
  assert.equal(frequentWork < rareWork || frequent.summary.totalCompletedJobs < rare.summary.totalCompletedJobs, true);
});

test("insufficient nodes create queued jobs", () => {
  const result = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, computeNodes: 2, concurrentJobs: 12 }, { totalTicks: 15 });
  assert.equal(result.summary.peakQueuedJobs > 0, true);
});

test("newly admitted jobs can make useful progress on their start tick", () => {
  const result = simulateHpcLab({ ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 2 }, { totalTicks: 1 });
  const started = result.jobs.filter((job) => job.startTick === 1);

  assert.equal(started.length > 0, true);
  assert.equal(started.every((job) => job.completedWorkTicks > 0), true);
});
