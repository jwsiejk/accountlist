import type { HpcLabJobDefinition, HpcLabJobInstance, HpcLabNormalizedConfig, HpcLabSimulationOptions } from "./types";

const toIntervalTicks = (minutes: number, tickDurationSeconds: number) => Math.max(1, Math.round((minutes * 60) / tickDurationSeconds));

const buildTraditionalHpcJob = (index: number): HpcLabJobDefinition => ({
  id: `job-${index + 1}`,
  kind: "traditional-hpc",
  ioPattern: "sequential-read-heavy",
  requiredCpuNodes: 2 + (index % 3),
  requiredGpuNodes: 0,
  runtimeTicks: 40 + (index % 5) * 6,
  baseReadGbps: 12 + (index % 4) * 1.5,
  baseWriteGbps: 5 + (index % 3),
  metadataOpsPerTick: 180 + (index % 4) * 20,
  checkpointIntervalTicks: null,
  checkpointWriteMultiplier: 1,
  checkpointPauseRatio: 0,
});

const buildAiTrainingJob = (
  index: number,
  config: HpcLabNormalizedConfig,
  options: HpcLabSimulationOptions,
): HpcLabJobDefinition => ({
  id: `job-${index + 1}`,
  kind: "distributed-ai-training",
  ioPattern: "steady-mixed-with-checkpoints",
  requiredCpuNodes: 1,
  requiredGpuNodes: 2 + (index % 2),
  runtimeTicks: 48 + (index % 4) * 8,
  baseReadGbps: 10 + (index % 3) * 1.2,
  baseWriteGbps: 4 + (index % 2),
  metadataOpsPerTick: 260 + (index % 4) * 25,
  checkpointIntervalTicks: toIntervalTicks(config.checkpointFrequencyMinutes, options.tickDurationSeconds),
  checkpointWriteMultiplier: 2.4,
  checkpointPauseRatio: 0.2,
});

const buildMetadataHeavyJob = (index: number): HpcLabJobDefinition => ({
  id: `job-${index + 1}`,
  kind: "metadata-heavy",
  ioPattern: "small-random-metadata-heavy",
  requiredCpuNodes: 1,
  requiredGpuNodes: 0,
  runtimeTicks: 30 + (index % 6) * 4,
  baseReadGbps: 2.2 + (index % 3) * 0.45,
  baseWriteGbps: 1.8 + (index % 3) * 0.4,
  metadataOpsPerTick: 1050 + (index % 5) * 70,
  checkpointIntervalTicks: null,
  checkpointWriteMultiplier: 1,
  checkpointPauseRatio: 0,
});

export const buildDeterministicJobPlan = (
  config: HpcLabNormalizedConfig,
  options: HpcLabSimulationOptions,
): HpcLabJobInstance[] => {
  const jobs: HpcLabJobDefinition[] = [];

  for (let index = 0; index < config.concurrentJobs; index += 1) {
    if (config.workloadType === "distributed-ai-training") {
      jobs.push(buildAiTrainingJob(index, config, options));
    } else if (config.workloadType === "metadata-heavy") {
      jobs.push(buildMetadataHeavyJob(index));
    } else {
      jobs.push(buildTraditionalHpcJob(index));
    }
  }

  return jobs.map((job) => ({
    ...job,
    state: "queued",
    progressTicks: 0,
    completedWorkTicks: 0,
    effectiveProgressLastTick: 0,
    startTick: null,
    completedTick: null,
  }));
};
