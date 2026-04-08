export type HpcLabPresetId = "classic-hpc" | "ai-training" | "small-file";

export type HpcLabWorkloadType = "traditional-hpc" | "distributed-ai-training" | "metadata-heavy";

export type HpcLabFileSizeDistribution = "large-sequential" | "mixed" | "small-random";

export type HpcLabConfig = {
  computeNodes: number;
  gpuNodes: number;
  ossCount: number;
  ostPerOss: number;
  stripeWidth: number;
  metadataLatencyMs: number;
  networkBandwidthGbps: number;
  workloadType: HpcLabWorkloadType;
  fileSizeDistribution: HpcLabFileSizeDistribution;
  checkpointFrequencyMinutes: number;
  concurrentJobs: number;
};

export type HpcLabPreset = {
  id: HpcLabPresetId;
  name: string;
  description: string;
  initialConfig: HpcLabConfig;
};

export const HPC_LAB_PANEL_KEYS = [
  "cluster-topology",
  "throughput-over-time",
  "metadata-load",
  "ost-load-distribution",
  "job-queue-active-jobs",
  "compute-utilization",
  "waiting-on-data",
  "checkpoint-pause-impact",
  "bottleneck-attribution",
] as const;

export type HpcLabPanelKey = (typeof HPC_LAB_PANEL_KEYS)[number];
