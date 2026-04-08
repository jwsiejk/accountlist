import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHpcLabConfig, normalizeSimulationOptions } from "./config";
import { HPC_LAB_PRESETS } from "./presets";
import { buildStorageRequest, simulateStorageTick } from "./storage";
import { buildDeterministicJobPlan } from "./workloads";

test("stripe width affects effective data spreading and throughput", () => {
  const base = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[0].initialConfig, concurrentJobs: 8 });
  const narrow = { ...base, effectiveStripeWidth: 1, stripeWidth: 1 };
  const wide = { ...base, effectiveStripeWidth: base.totalOsts, stripeWidth: base.totalOsts };

  const jobs = buildDeterministicJobPlan(base, normalizeSimulationOptions()).slice(0, 6).map((job) => ({ ...job, state: "running" as const }));
  const request = buildStorageRequest(jobs, 1);

  const narrowTick = simulateStorageTick(narrow, request);
  const wideTick = simulateStorageTick(wide, request);

  assert.equal(wideTick.deliveredReadGbps + wideTick.deliveredWriteGbps > narrowTick.deliveredReadGbps + narrowTick.deliveredWriteGbps, true);
});

test("OST load distribution is deterministic", () => {
  const config = normalizeHpcLabConfig(HPC_LAB_PRESETS[0].initialConfig);
  const jobs = buildDeterministicJobPlan(config, normalizeSimulationOptions()).slice(0, 4).map((job) => ({ ...job, state: "running" as const }));
  const request = buildStorageRequest(jobs, 5);

  const first = simulateStorageTick(config, request);
  const second = simulateStorageTick(config, request);

  assert.deepEqual(first.ostLoadGbps, second.ostLoadGbps);
});

test("metadata-heavy workloads create stronger metadata pressure than classic-hpc", () => {
  const common = { concurrentJobs: 10, metadataLatencyMs: 2.5 };
  const classicConfig = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[0].initialConfig, ...common, workloadType: "traditional-hpc" });
  const metadataConfig = normalizeHpcLabConfig({ ...HPC_LAB_PRESETS[2].initialConfig, ...common, workloadType: "metadata-heavy" });

  const options = normalizeSimulationOptions();
  const classicReq = buildStorageRequest(
    buildDeterministicJobPlan(classicConfig, options).map((job) => ({ ...job, state: "running" as const })),
    1,
  );
  const metadataReq = buildStorageRequest(
    buildDeterministicJobPlan(metadataConfig, options).map((job) => ({ ...job, state: "running" as const })),
    1,
  );

  const classicTick = simulateStorageTick(classicConfig, classicReq);
  const metadataTick = simulateStorageTick(metadataConfig, metadataReq);

  assert.equal(metadataTick.metadataPressure > classicTick.metadataPressure, true);
});
