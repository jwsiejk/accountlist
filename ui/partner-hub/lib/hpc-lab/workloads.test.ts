import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHpcLabConfig, normalizeSimulationOptions } from "./config";
import { HPC_LAB_PRESETS } from "./presets";
import { buildDeterministicJobPlan } from "./workloads";

test("buildDeterministicJobPlan is deterministic for identical inputs", () => {
  const config = normalizeHpcLabConfig(HPC_LAB_PRESETS[0].initialConfig);
  const options = normalizeSimulationOptions();

  const first = buildDeterministicJobPlan(config, options);
  const second = buildDeterministicJobPlan(config, options);

  assert.deepEqual(first, second);
});

test("buildDeterministicJobPlan builds GPU-oriented jobs for ai-training", () => {
  const config = normalizeHpcLabConfig(HPC_LAB_PRESETS[1].initialConfig);
  const options = normalizeSimulationOptions();

  const jobs = buildDeterministicJobPlan(config, options);

  assert.equal(jobs.length, config.concurrentJobs);
  assert.equal(jobs.every((job) => job.kind === "distributed-ai-training"), true);
  assert.equal(jobs.every((job) => job.requiredGpuNodes > 0), true);
  assert.equal(jobs.some((job) => job.checkpointIntervalTicks !== null), true);
});

test("metadata-heavy workload has stronger metadata demand than classic-hpc", () => {
  const options = normalizeSimulationOptions();
  const classicConfig = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 10 });
  const smallFileConfig = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[2].initialConfig, concurrentJobs: 10 });

  const classicTotal = buildDeterministicJobPlan(classicConfig, options).reduce((sum, job) => sum + job.metadataOpsPerTick, 0);
  const smallFileTotal = buildDeterministicJobPlan(smallFileConfig, options).reduce((sum, job) => sum + job.metadataOpsPerTick, 0);

  assert.equal(smallFileTotal > classicTotal, true);
});
