import { normalizeHpcLabConfig, normalizeSimulationOptions } from "./config";
import { simulateNetworkTick } from "./network";
import { advanceSchedulerTick, createSchedulerState } from "./scheduler";
import { buildStorageRequest, simulateStorageTick } from "./storage";
import type { HpcLabConfig, HpcLabSimulationOptions, HpcLabSimulationResult, HpcLabTickSnapshot } from "./types";
import { buildDeterministicJobPlan } from "./workloads";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const average = (values: number[]) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);

export const simulateHpcLab = (config: HpcLabConfig, options?: Partial<HpcLabSimulationOptions>): HpcLabSimulationResult => {
  const normalizedConfig = normalizeHpcLabConfig(config);
  const normalizedOptions = normalizeSimulationOptions(options);
  const seedJobs = buildDeterministicJobPlan(normalizedConfig, normalizedOptions);

  let scheduler = createSchedulerState(seedJobs);
  const timeline: HpcLabTickSnapshot[] = [];

  for (let tick = 1; tick <= normalizedOptions.totalTicks; tick += 1) {
    scheduler = advanceSchedulerTick(scheduler, normalizedConfig, tick);

    const request = buildStorageRequest(scheduler.runningJobs, tick);
    const storage = simulateStorageTick(normalizedConfig, request);

    const network = simulateNetworkTick(storage.deliveredReadGbps, storage.deliveredWriteGbps, normalizedConfig.networkBandwidthGbps);

    const waitOnDataRatio =
      request.requestedReadGbps + request.requestedWriteGbps > 0
        ? clamp01(1 - (network.deliveredReadGbps + network.deliveredWriteGbps) / (request.requestedReadGbps + request.requestedWriteGbps))
        : 0;

    const checkpointActiveJobs = scheduler.runningJobs.filter(
      (job) => job.checkpointIntervalTicks !== null && job.progressTicks > 0 && job.progressTicks % job.checkpointIntervalTicks === 0,
    );
    const checkpointPauseRatio =
      scheduler.runningJobs.length > 0
        ? checkpointActiveJobs.reduce((sum, job) => sum + job.checkpointPauseRatio, 0) / scheduler.runningJobs.length
        : 0;

    timeline.push({
      tick,
      queuedJobs: scheduler.queuedJobs.length,
      runningJobs: scheduler.runningJobs.length,
      completedJobs: scheduler.completedJobs.length,
      cpuUtilization: clamp01(scheduler.allocatedCpuNodes / normalizedConfig.computeNodes),
      gpuUtilization: clamp01(scheduler.allocatedGpuNodes / normalizedConfig.gpuNodes),
      requestedReadGbps: request.requestedReadGbps,
      requestedWriteGbps: request.requestedWriteGbps,
      deliveredReadGbps: network.deliveredReadGbps,
      deliveredWriteGbps: network.deliveredWriteGbps,
      metadataOpsRequested: storage.metadataOpsRequested,
      metadataOpsServed: storage.metadataOpsServed,
      metadataUtilization: storage.metadataUtilization,
      ostLoadGbps: storage.ostLoadGbps,
      networkUtilization: network.networkUtilization,
      waitOnDataRatio,
      checkpointActiveJobs: checkpointActiveJobs.length,
      checkpointPauseRatio,
      constraintSignals: {
        computePressure: clamp01(scheduler.queuedJobs.length / Math.max(1, seedJobs.length)),
        storagePressure: storage.storagePressure,
        metadataPressure: storage.metadataPressure,
        networkPressure: network.networkPressure,
      },
    });
  }

  const allJobs = [...scheduler.queuedJobs, ...scheduler.runningJobs, ...scheduler.completedJobs].sort((a, b) => a.id.localeCompare(b.id));

  return {
    normalizedConfig,
    options: normalizedOptions,
    timeline,
    jobs: allJobs,
    summary: {
      avgCpuUtilization: average(timeline.map((tick) => tick.cpuUtilization)),
      avgGpuUtilization: average(timeline.map((tick) => tick.gpuUtilization)),
      avgNetworkUtilization: average(timeline.map((tick) => tick.networkUtilization)),
      avgWaitOnDataRatio: average(timeline.map((tick) => tick.waitOnDataRatio)),
      totalCompletedJobs: scheduler.completedJobs.length,
      peakQueuedJobs: Math.max(0, ...timeline.map((tick) => tick.queuedJobs)),
      avgDeliveredReadGbps: average(timeline.map((tick) => tick.deliveredReadGbps)),
      avgDeliveredWriteGbps: average(timeline.map((tick) => tick.deliveredWriteGbps)),
      avgMetadataUtilization: average(timeline.map((tick) => tick.metadataUtilization)),
    },
    assumptions: [
      "Deterministic tick-based simulation with no randomness.",
      "Throughput and metadata service levels model relative behavior, not vendor-certified benchmark numbers.",
      "Storage throughput depends on OST inventory, effective stripe width, and metadata latency pressure.",
      "Distributed AI training jobs produce deterministic checkpoint bursts based on checkpoint interval.",
      "Network caps aggregate delivered storage throughput per tick.",
    ],
  };
};
