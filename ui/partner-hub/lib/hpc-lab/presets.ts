import type { HpcLabPreset } from "@/lib/hpc-lab/types";

export const HPC_LAB_PRESETS: readonly HpcLabPreset[] = [
  {
    id: "classic-hpc",
    name: "Classic HPC",
    description: "Balanced CPU-focused cluster profile for large sequential scientific workloads.",
    initialConfig: {
      computeNodes: 96,
      gpuNodes: 8,
      ossCount: 12,
      ostPerOss: 8,
      stripeWidth: 8,
      metadataLatencyMs: 1.4,
      networkBandwidthGbps: 200,
      workloadType: "traditional-hpc",
      fileSizeDistribution: "large-sequential",
      checkpointFrequencyMinutes: 30,
      concurrentJobs: 24,
    },
  },
  {
    id: "ai-training",
    name: "AI Training",
    description: "GPU-heavy profile tuned for distributed training with frequent checkpoint writes.",
    initialConfig: {
      computeNodes: 32,
      gpuNodes: 64,
      ossCount: 16,
      ostPerOss: 10,
      stripeWidth: 12,
      metadataLatencyMs: 1.8,
      networkBandwidthGbps: 400,
      workloadType: "distributed-ai-training",
      fileSizeDistribution: "mixed",
      checkpointFrequencyMinutes: 10,
      concurrentJobs: 12,
    },
  },
  {
    id: "small-file",
    name: "Small File Workload",
    description: "Metadata-sensitive profile for many small random I/O operations and high job concurrency.",
    initialConfig: {
      computeNodes: 80,
      gpuNodes: 4,
      ossCount: 14,
      ostPerOss: 6,
      stripeWidth: 2,
      metadataLatencyMs: 2.2,
      networkBandwidthGbps: 100,
      workloadType: "metadata-heavy",
      fileSizeDistribution: "small-random",
      checkpointFrequencyMinutes: 20,
      concurrentJobs: 64,
    },
  },
] as const;

export const getHpcLabPresetById = (id: HpcLabPreset["id"]) =>
  HPC_LAB_PRESETS.find((preset) => preset.id === id);
