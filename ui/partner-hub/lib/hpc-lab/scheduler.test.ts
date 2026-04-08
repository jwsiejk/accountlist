import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHpcLabConfig, normalizeSimulationOptions } from "./config";
import { HPC_LAB_PRESETS } from "./presets";
import { advanceSchedulerTick, createSchedulerState } from "./scheduler";
import { buildDeterministicJobPlan } from "./workloads";

test("scheduler queues jobs when nodes are insufficient", () => {
  const config = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[0].initialConfig, computeNodes: 2, concurrentJobs: 6 });
  const jobs = buildDeterministicJobPlan(config, normalizeSimulationOptions());

  const state = advanceSchedulerTick(createSchedulerState(jobs), config, 1);

  assert.equal(state.queuedJobs.length > 0, true);
  assert.equal(state.runningJobs.length > 0, true);
});

test("scheduler allocates and releases CPU/GPU resources correctly", () => {
  const config = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[1].initialConfig, concurrentJobs: 3, gpuNodes: 8 });
  const jobs = buildDeterministicJobPlan(config, normalizeSimulationOptions());

  let state = createSchedulerState(jobs);
  state = advanceSchedulerTick(state, config, 1);
  const initialRunning = state.runningJobs.length;

  for (let tick = 2; tick <= 120; tick += 1) {
    state = advanceSchedulerTick(state, config, tick);
  }

  assert.equal(initialRunning > 0, true);
  assert.equal(state.completedJobs.length > 0, true);
  assert.equal(state.allocatedGpuNodes <= config.gpuNodes, true);
  assert.equal(state.allocatedCpuNodes <= config.computeNodes, true);
});

test("scheduler does not oversubscribe nodes", () => {
  const config = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[1].initialConfig, gpuNodes: 4, concurrentJobs: 8 });
  const jobs = buildDeterministicJobPlan(config, normalizeSimulationOptions());

  const state = advanceSchedulerTick(createSchedulerState(jobs), config, 1);

  assert.equal(state.allocatedGpuNodes <= config.gpuNodes, true);
  assert.equal(state.allocatedCpuNodes <= config.computeNodes, true);
});
