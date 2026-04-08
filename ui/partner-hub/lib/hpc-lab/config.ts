import type { HpcLabConfig, HpcLabNormalizedConfig, HpcLabSimulationOptions } from "./types";

export const DEFAULT_HPC_LAB_SIMULATION_OPTIONS: HpcLabSimulationOptions = {
  tickDurationSeconds: 1,
  totalTicks: 120,
};

export const isFinitePositiveNumber = (value: number): boolean => Number.isFinite(value) && value > 0;

const assertFinitePositive = (value: number, fieldName: keyof HpcLabConfig | keyof HpcLabSimulationOptions) => {
  if (!isFinitePositiveNumber(value)) {
    throw new Error(`Invalid ${String(fieldName)}: expected a finite number > 0, received ${value}`);
  }
};

const normalizeCount = (value: number, fieldName: keyof HpcLabConfig): number => {
  assertFinitePositive(value, fieldName);
  return Math.max(1, Math.floor(value));
};

export const normalizeSimulationOptions = (options?: Partial<HpcLabSimulationOptions>): HpcLabSimulationOptions => {
  const merged = {
    ...DEFAULT_HPC_LAB_SIMULATION_OPTIONS,
    ...options,
  };

  assertFinitePositive(merged.tickDurationSeconds, "tickDurationSeconds");
  assertFinitePositive(merged.totalTicks, "totalTicks");

  return {
    tickDurationSeconds: merged.tickDurationSeconds,
    totalTicks: Math.max(1, Math.floor(merged.totalTicks)),
  };
};

export const normalizeHpcLabConfig = (config: HpcLabConfig): HpcLabNormalizedConfig => {
  assertFinitePositive(config.metadataLatencyMs, "metadataLatencyMs");
  assertFinitePositive(config.networkBandwidthGbps, "networkBandwidthGbps");
  assertFinitePositive(config.checkpointFrequencyMinutes, "checkpointFrequencyMinutes");

  const computeNodes = normalizeCount(config.computeNodes, "computeNodes");
  const gpuNodes = normalizeCount(config.gpuNodes, "gpuNodes");
  const ossCount = normalizeCount(config.ossCount, "ossCount");
  const ostPerOss = normalizeCount(config.ostPerOss, "ostPerOss");
  const stripeWidth = normalizeCount(config.stripeWidth, "stripeWidth");
  const concurrentJobs = normalizeCount(config.concurrentJobs, "concurrentJobs");

  const totalOsts = ossCount * ostPerOss;
  const effectiveStripeWidth = Math.min(stripeWidth, totalOsts);

  return {
    ...config,
    computeNodes,
    gpuNodes,
    ossCount,
    ostPerOss,
    stripeWidth,
    concurrentJobs,
    totalOsts,
    effectiveStripeWidth,
  };
};
