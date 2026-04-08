import { normalizeHpcLabConfig, normalizeSimulationOptions } from "./config";
import { simulateNetworkTick } from "./network";
import { admitQueuedJobs, applyRunningJobProgress, createSchedulerState } from "./scheduler";
import { buildStorageRequest, isCheckpointActiveThisTick, simulateStorageTick } from "./storage";
import type { HpcLabConfig, HpcLabJobInstance, HpcLabSimulationOptions, HpcLabSimulationResult, HpcLabTickSnapshot } from "./types";
import { buildDeterministicJobPlan } from "./workloads";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const average = (values: number[]) => (values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length);

const computeEffectiveProgressForJob = (
  job: HpcLabJobInstance,
  deliveredDataRatio: number,
  metadataServiceRatio: number,
  waitOnDataRatio: number,
  checkpointActive: boolean,
): number => {
  const dataRatio = clamp01(deliveredDataRatio);
  const metadataRatio = clamp01(metadataServiceRatio);
  const waitFreeRatio = clamp01(1 - waitOnDataRatio);
  const checkpointRatio = checkpointActive ? clamp01(1 - job.checkpointPauseRatio) : 1;

  if (job.kind === "traditional-hpc") {
    return dataRatio * dataRatio;
  }

  if (job.kind === "distributed-ai-training") {
    return dataRatio * checkpointRatio;
  }

  return metadataRatio * metadataRatio * waitFreeRatio;
};

export const simulateHpcLab = (config: HpcLabConfig, options?: Partial<HpcLabSimulationOptions>): HpcLabSimulationResult => {
  const normalizedConfig = normalizeHpcLabConfig(config);
  const normalizedOptions = normalizeSimulationOptions(options);
  const seedJobs = buildDeterministicJobPlan(normalizedConfig, normalizedOptions);

  let scheduler = createSchedulerState(seedJobs);
  const timeline: HpcLabTickSnapshot[] = [];

  for (let tick = 1; tick <= normalizedOptions.totalTicks; tick += 1) {
    scheduler = admitQueuedJobs(scheduler, normalizedConfig, tick);

    const request = buildStorageRequest(scheduler.runningJobs, tick);
    const storage = simulateStorageTick(normalizedConfig, request);
    const network = simulateNetworkTick(storage.deliveredReadGbps, storage.deliveredWriteGbps, normalizedConfig.networkBandwidthGbps);

    const requestedTotal = request.requestedReadGbps + request.requestedWriteGbps;
    const deliveredTotal = network.deliveredReadGbps + network.deliveredWriteGbps;
    const waitOnDataRatio = requestedTotal > 0 ? clamp01(1 - deliveredTotal / requestedTotal) : 0;
    const deliveredDataRatio = requestedTotal > 0 ? clamp01(deliveredTotal / requestedTotal) : 1;
    const metadataServiceRatio = request.metadataOpsRequested > 0 ? clamp01(storage.metadataOpsServed / request.metadataOpsRequested) : 1;

    const checkpointActiveJobs = scheduler.runningJobs.filter((job) => isCheckpointActiveThisTick(job));
    const checkpointPauseRatio =
      scheduler.runningJobs.length > 0
        ? checkpointActiveJobs.reduce((sum, job) => sum + job.checkpointPauseRatio, 0) / scheduler.runningJobs.length
        : 0;

    const effectiveWorkByJobId = Object.fromEntries(
      scheduler.runningJobs.map((job) => [
        job.id,
        computeEffectiveProgressForJob(job, deliveredDataRatio, metadataServiceRatio, waitOnDataRatio, isCheckpointActiveThisTick(job)),
      ]),
    );

    scheduler = applyRunningJobProgress(scheduler, tick, effectiveWorkByJobId);

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
      "Per-job effective progress is deterministic and can be fractional based on data delivery, metadata service, and checkpoint pause conditions.",
      "Distributed AI training jobs produce deterministic checkpoint bursts based on checkpoint interval.",
      "Network caps aggregate delivered storage throughput per tick.",
    ],
  };
};
