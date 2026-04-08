import { isFinitePositiveNumber, normalizeHpcLabConfig, normalizeSimulationOptions } from "./config";
import { getHpcLabPresetSimulationOptions } from "./presets";
import type {
  HpcLabConfig,
  HpcLabFileSizeDistribution,
  HpcLabNormalizedConfig,
  HpcLabPreset,
  HpcLabPresetId,
  HpcLabSimulationOptions,
  HpcLabWorkloadType,
} from "./types";

export type HpcLabFormState = {
  presetId: HpcLabPresetId;
  computeNodes: string;
  gpuNodes: string;
  ossCount: string;
  ostPerOss: string;
  stripeWidth: string;
  metadataLatencyMs: string;
  networkBandwidthGbps: string;
  workloadType: HpcLabWorkloadType;
  fileSizeDistribution: HpcLabFileSizeDistribution;
  checkpointFrequencyMinutes: string;
  concurrentJobs: string;
  totalTicks: string;
  tickDurationSeconds: string;
};

export type HpcLabFormNumericField = Exclude<keyof HpcLabFormState, "presetId" | "workloadType" | "fileSizeDistribution">;

export type HpcLabFormValidationErrors = Partial<Record<HpcLabFormNumericField, string>>;

export type ParsedHpcLabFormSuccess = {
  ok: true;
  config: HpcLabNormalizedConfig;
  options: HpcLabSimulationOptions;
};

export type ParsedHpcLabFormFailure = {
  ok: false;
  errors: HpcLabFormValidationErrors;
};

export type ParsedHpcLabFormResult = ParsedHpcLabFormSuccess | ParsedHpcLabFormFailure;

const fieldLabels: Record<HpcLabFormNumericField, string> = {
  computeNodes: "Compute nodes",
  gpuNodes: "GPU nodes",
  ossCount: "OSS count",
  ostPerOss: "OST per OSS",
  stripeWidth: "Stripe width",
  metadataLatencyMs: "Metadata latency",
  networkBandwidthGbps: "Network bandwidth",
  checkpointFrequencyMinutes: "Checkpoint frequency",
  concurrentJobs: "Concurrent jobs",
  totalTicks: "Simulation duration",
  tickDurationSeconds: "Tick duration",
};

const toEditableNumber = (value: number): string => String(value);

const parsePositiveNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!isFinitePositiveNumber(parsed)) {
    return null;
  }

  return parsed;
};

const validatePositiveField = (
  state: HpcLabFormState,
  field: HpcLabFormNumericField,
  errors: HpcLabFormValidationErrors,
): number | null => {
  const parsed = parsePositiveNumber(state[field]);
  if (parsed === null) {
    errors[field] = `${fieldLabels[field]} must be a finite number greater than 0.`;
    return null;
  }

  return parsed;
};

export const buildFormStateFromPreset = (preset: HpcLabPreset): HpcLabFormState => {
  const options = getHpcLabPresetSimulationOptions(preset);

  return {
    presetId: preset.id,
    computeNodes: toEditableNumber(preset.initialConfig.computeNodes),
    gpuNodes: toEditableNumber(preset.initialConfig.gpuNodes),
    ossCount: toEditableNumber(preset.initialConfig.ossCount),
    ostPerOss: toEditableNumber(preset.initialConfig.ostPerOss),
    stripeWidth: toEditableNumber(preset.initialConfig.stripeWidth),
    metadataLatencyMs: toEditableNumber(preset.initialConfig.metadataLatencyMs),
    networkBandwidthGbps: toEditableNumber(preset.initialConfig.networkBandwidthGbps),
    workloadType: preset.initialConfig.workloadType,
    fileSizeDistribution: preset.initialConfig.fileSizeDistribution,
    checkpointFrequencyMinutes: toEditableNumber(preset.initialConfig.checkpointFrequencyMinutes),
    concurrentJobs: toEditableNumber(preset.initialConfig.concurrentJobs),
    totalTicks: toEditableNumber(options.totalTicks),
    tickDurationSeconds: toEditableNumber(options.tickDurationSeconds),
  };
};

export const resetFormStateToPreset = (preset: HpcLabPreset): HpcLabFormState => buildFormStateFromPreset(preset);

export const parseFormStateToSimulationInput = (state: HpcLabFormState): ParsedHpcLabFormResult => {
  const errors: HpcLabFormValidationErrors = {};

  const computeNodes = validatePositiveField(state, "computeNodes", errors);
  const gpuNodes = validatePositiveField(state, "gpuNodes", errors);
  const ossCount = validatePositiveField(state, "ossCount", errors);
  const ostPerOss = validatePositiveField(state, "ostPerOss", errors);
  const stripeWidth = validatePositiveField(state, "stripeWidth", errors);
  const metadataLatencyMs = validatePositiveField(state, "metadataLatencyMs", errors);
  const networkBandwidthGbps = validatePositiveField(state, "networkBandwidthGbps", errors);
  const checkpointFrequencyMinutes = validatePositiveField(state, "checkpointFrequencyMinutes", errors);
  const concurrentJobs = validatePositiveField(state, "concurrentJobs", errors);
  const totalTicks = validatePositiveField(state, "totalTicks", errors);
  const tickDurationSeconds = validatePositiveField(state, "tickDurationSeconds", errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const config = normalizeHpcLabConfig({
    computeNodes: computeNodes as number,
    gpuNodes: gpuNodes as number,
    ossCount: ossCount as number,
    ostPerOss: ostPerOss as number,
    stripeWidth: stripeWidth as number,
    metadataLatencyMs: metadataLatencyMs as number,
    networkBandwidthGbps: networkBandwidthGbps as number,
    workloadType: state.workloadType,
    fileSizeDistribution: state.fileSizeDistribution,
    checkpointFrequencyMinutes: checkpointFrequencyMinutes as number,
    concurrentJobs: concurrentJobs as number,
  });

  const options = normalizeSimulationOptions({
    totalTicks: totalTicks as number,
    tickDurationSeconds: tickDurationSeconds as number,
  });

  return {
    ok: true,
    config,
    options,
  };
};

export const isFormDirtyAgainstPreset = (state: HpcLabFormState, preset: HpcLabPreset): boolean => {
  const baseline = buildFormStateFromPreset(preset);

  return (
    state.computeNodes.trim() !== baseline.computeNodes ||
    state.gpuNodes.trim() !== baseline.gpuNodes ||
    state.ossCount.trim() !== baseline.ossCount ||
    state.ostPerOss.trim() !== baseline.ostPerOss ||
    state.stripeWidth.trim() !== baseline.stripeWidth ||
    state.metadataLatencyMs.trim() !== baseline.metadataLatencyMs ||
    state.networkBandwidthGbps.trim() !== baseline.networkBandwidthGbps ||
    state.workloadType !== baseline.workloadType ||
    state.fileSizeDistribution !== baseline.fileSizeDistribution ||
    state.checkpointFrequencyMinutes.trim() !== baseline.checkpointFrequencyMinutes ||
    state.concurrentJobs.trim() !== baseline.concurrentJobs ||
    state.totalTicks.trim() !== baseline.totalTicks ||
    state.tickDurationSeconds.trim() !== baseline.tickDurationSeconds
  );
};
