import type { HpcLabJobInstance, HpcLabNormalizedConfig, HpcLabSchedulerState } from "./types";

const cloneJob = (job: HpcLabJobInstance): HpcLabJobInstance => ({ ...job });

const canAllocate = (job: HpcLabJobInstance, availableCpu: number, availableGpu: number) =>
  job.requiredCpuNodes <= availableCpu && job.requiredGpuNodes <= availableGpu;

export const createSchedulerState = (jobs: HpcLabJobInstance[]): HpcLabSchedulerState => ({
  queuedJobs: jobs.map(cloneJob),
  runningJobs: [],
  completedJobs: [],
  allocatedCpuNodes: 0,
  allocatedGpuNodes: 0,
});

export const advanceSchedulerTick = (
  state: HpcLabSchedulerState,
  config: HpcLabNormalizedConfig,
  tick: number,
): HpcLabSchedulerState => {
  const completedJobs = [...state.completedJobs];
  const queuedJobs = [...state.queuedJobs];

  let allocatedCpuNodes = 0;
  let allocatedGpuNodes = 0;

  const stillRunning: HpcLabJobInstance[] = [];
  for (const running of state.runningJobs) {
    const progressed = { ...running, progressTicks: running.progressTicks + 1 };
    if (progressed.progressTicks >= progressed.runtimeTicks) {
      completedJobs.push({ ...progressed, state: "completed", completedTick: tick });
    } else {
      stillRunning.push(progressed);
      allocatedCpuNodes += progressed.requiredCpuNodes;
      allocatedGpuNodes += progressed.requiredGpuNodes;
    }
  }

  const runningJobs = [...stillRunning];

  let availableCpu = config.computeNodes - allocatedCpuNodes;
  let availableGpu = config.gpuNodes - allocatedGpuNodes;

  const nextQueue: HpcLabJobInstance[] = [];
  for (const queued of queuedJobs) {
    if (canAllocate(queued, availableCpu, availableGpu)) {
      const started: HpcLabJobInstance = {
        ...queued,
        state: "running",
        startTick: queued.startTick ?? tick,
      };
      runningJobs.push(started);
      allocatedCpuNodes += started.requiredCpuNodes;
      allocatedGpuNodes += started.requiredGpuNodes;
      availableCpu -= started.requiredCpuNodes;
      availableGpu -= started.requiredGpuNodes;
    } else {
      nextQueue.push(queued);
    }
  }

  return {
    queuedJobs: nextQueue,
    runningJobs,
    completedJobs,
    allocatedCpuNodes,
    allocatedGpuNodes,
  };
};
