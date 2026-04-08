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
  effectiveWorkByJobId: Readonly<Record<string, number>>,
): HpcLabSchedulerState => {
  const completedJobs = [...state.completedJobs];
  const stillRunning: HpcLabJobInstance[] = [];

  let allocatedCpuNodes = 0;
  let allocatedGpuNodes = 0;

  for (const running of state.runningJobs) {
    const effectiveProgressLastTick = Math.max(0, effectiveWorkByJobId[running.id] ?? 0);
    const progressed: HpcLabJobInstance = {
      ...running,
      progressTicks: running.progressTicks + 1,
      effectiveProgressLastTick,
      completedWorkTicks: running.completedWorkTicks + effectiveProgressLastTick,
    };

    if (progressed.completedWorkTicks >= progressed.runtimeTicks) {
      completedJobs.push({ ...progressed, state: "completed", completedTick: tick });
    } else {
      stillRunning.push(progressed);
      allocatedCpuNodes += progressed.requiredCpuNodes;
      allocatedGpuNodes += progressed.requiredGpuNodes;
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
