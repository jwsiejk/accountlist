import type {
  HpcLabJobInstance,
  HpcLabNormalizedConfig,
  HpcLabStorageRequest,
  HpcLabStorageTickState,
} from "./types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const distributeAcrossOsts = (totalGbps: number, totalOsts: number, spreadWidth: number, seed: number): number[] => {
  const loads = new Array<number>(totalOsts).fill(0);
  if (totalOsts <= 0 || spreadWidth <= 0 || totalGbps <= 0) {
    return loads;
  }

  const perOst = totalGbps / spreadWidth;
  for (let offset = 0; offset < spreadWidth; offset += 1) {
    const index = (seed + offset) % totalOsts;
    loads[index] += perOst;
  }

  return loads;
};

export const isCheckpointActiveThisTick = (job: HpcLabJobInstance): boolean =>
  job.checkpointIntervalTicks !== null && (job.elapsedRuntimeTicks + 1) % job.checkpointIntervalTicks === 0;

export const buildStorageRequest = (runningJobs: HpcLabJobInstance[], tick: number): HpcLabStorageRequest => {
  let requestedReadGbps = 0;
  let requestedWriteGbps = 0;
  let metadataOpsRequested = 0;

  for (const job of runningJobs) {
    const hasCheckpoint = isCheckpointActiveThisTick(job);
    requestedReadGbps += job.baseReadGbps;
    requestedWriteGbps += hasCheckpoint ? job.baseWriteGbps * job.checkpointWriteMultiplier : job.baseWriteGbps;
    metadataOpsRequested += hasCheckpoint ? job.metadataOpsPerTick * 1.2 : job.metadataOpsPerTick;
  }

  return {
    requestedReadGbps,
    requestedWriteGbps,
    metadataOpsRequested,
    stripeSeed: tick,
  };
};

export const simulateStorageTick = (
  config: HpcLabNormalizedConfig,
  request: HpcLabStorageRequest,
): HpcLabStorageTickState => {
  const requestedTotal = request.requestedReadGbps + request.requestedWriteGbps;
  const totalOsts = config.totalOsts;

  const ostPerGbpsCapacity = 8;
  const ostTotalCapacity = totalOsts * ostPerGbpsCapacity;

  const stripeEffect = 0.35 + 0.65 * (config.effectiveStripeWidth / totalOsts);
  const storageCapacity = ostTotalCapacity * stripeEffect;

  const servedStorageRatio = requestedTotal > 0 ? Math.min(1, storageCapacity / requestedTotal) : 1;

  const metadataCapacityPerTick = 2800 / config.metadataLatencyMs;
  const metadataOpsServed = Math.min(request.metadataOpsRequested, metadataCapacityPerTick);
  const metadataRatio = request.metadataOpsRequested > 0 ? metadataOpsServed / request.metadataOpsRequested : 1;

  const combinedRatio = Math.min(servedStorageRatio, metadataRatio);

  const deliveredReadGbps = request.requestedReadGbps * combinedRatio;
  const deliveredWriteGbps = request.requestedWriteGbps * combinedRatio;

  const spreadWidth = Math.max(1, config.effectiveStripeWidth);
  const ostLoadGbps = distributeAcrossOsts(deliveredReadGbps + deliveredWriteGbps, totalOsts, spreadWidth, request.stripeSeed);

  return {
    requestedReadGbps: request.requestedReadGbps,
    requestedWriteGbps: request.requestedWriteGbps,
    deliveredReadGbps,
    deliveredWriteGbps,
    metadataOpsRequested: request.metadataOpsRequested,
    metadataOpsServed,
    metadataUtilization: clamp01(request.metadataOpsRequested > 0 ? request.metadataOpsRequested / metadataCapacityPerTick : 0),
    ostLoadGbps,
    storagePressure: clamp01(1 - servedStorageRatio),
    metadataPressure: clamp01(1 - metadataRatio),
  };
};
