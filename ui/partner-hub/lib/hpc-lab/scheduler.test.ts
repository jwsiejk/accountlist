import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHpcLabConfig, normalizeSimulationOptions } from "./config";
import { HPC_LAB_PRESETS } from "./presets";
import { admitQueuedJobs, applyRunningJobProgress, createSchedulerState } from "./scheduler";
import { buildDeterministicJobPlan } from "./workloads";

test("scheduler queues jobs when nodes are insufficient", () => {
  const config = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[0].initialConfig, computeNodes: 2, concurrentJobs: 6 });
  const jobs = buildDeterministicJobPlan(config, normalizeSimulationOptions());

  const state = admitQueuedJobs(createSchedulerState(jobs), config, 1);

  assert.equal(state.queuedJobs.length > 0, true);
  assert.equal(state.runningJobs.length > 0, true);
});

test("scheduler allocates and releases CPU/GPU resources correctly", () => {
  const config = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[1].initialConfig, concurrentJobs: 3, gpuNodes: 8 });
  const jobs = buildDeterministicJobPlan(config, normalizeSimulationOptions());

  let state = createSchedulerState(jobs);
  state = admitQueuedJobs(state, config, 1);
  const initialRunning = state.runningJobs.length;

  for (let tick = 1; tick <= 120; tick += 1) {
    const progressed = state.runningJobs.map((job) => ({
      ...job,
      elapsedRuntimeTicks: job.elapsedRuntimeTicks + 1,
      effectiveProgressLastTick: 1,
      completedWorkTicks: job.completedWorkTicks + 1,
    }));
    state = applyRunningJobProgress(state, tick, progressed);
    state = admitQueuedJobs(state, config, tick + 1);
  }

  assert.equal(initialRunning > 0, true);
  assert.equal(state.completedJobs.length > 0, true);
  assert.equal(state.allocatedGpuNodes <= config.gpuNodes, true);
  assert.equal(state.allocatedCpuNodes <= config.computeNodes, true);
});

test("scheduler does not oversubscribe nodes", () => {
  const config = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[1].initialConfig, gpuNodes: 4, concurrentJobs: 8 });
  const jobs = buildDeterministicJobPlan(config, normalizeSimulationOptions());

  const state = admitQueuedJobs(createSchedulerState(jobs), config, 1);

  assert.equal(state.allocatedGpuNodes <= config.gpuNodes, true);
  assert.equal(state.allocatedCpuNodes <= config.computeNodes, true);
});
