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

export const admitQueuedJobs = (
  state: HpcLabSchedulerState,
  config: HpcLabNormalizedConfig,
  tick: number,
): HpcLabSchedulerState => {
  const completedJobs = [...state.completedJobs];
  const runningJobs = [...state.runningJobs];

  let allocatedCpuNodes = runningJobs.reduce((sum, job) => sum + job.requiredCpuNodes, 0);
  let allocatedGpuNodes = runningJobs.reduce((sum, job) => sum + job.requiredGpuNodes, 0);

  let availableCpu = config.computeNodes - allocatedCpuNodes;
  let availableGpu = config.gpuNodes - allocatedGpuNodes;

  const nextQueue: HpcLabJobInstance[] = [];
  for (const queued of state.queuedJobs) {
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

export const applyRunningJobProgress = (
  state: HpcLabSchedulerState,
  tick: number,
  nextRunningJobs: HpcLabJobInstance[],
): HpcLabSchedulerState => {
  const completedJobs = [...state.completedJobs];
  const stillRunning: HpcLabJobInstance[] = [];

  let allocatedCpuNodes = 0;
  let allocatedGpuNodes = 0;

  for (const running of nextRunningJobs) {
    if (running.completedWorkTicks >= running.runtimeTicks) {
      completedJobs.push({ ...running, state: "completed", completedTick: tick });
    } else {
      stillRunning.push(running);
      allocatedCpuNodes += running.requiredCpuNodes;
      allocatedGpuNodes += running.requiredGpuNodes;
    }
  }

  return {
    queuedJobs: [...state.queuedJobs],
    runningJobs: stillRunning,
    completedJobs,
    allocatedCpuNodes,
    allocatedGpuNodes,
  };
};
