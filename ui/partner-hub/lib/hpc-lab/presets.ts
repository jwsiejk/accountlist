import { DEFAULT_HPC_LAB_SIMULATION_OPTIONS } from "./config";
import type { HpcLabPreset, HpcLabSimulationOptions } from "./types";

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
    simulationDefaults: {
      totalTicks: 180,
      tickDurationSeconds: 1,
    },
    learningGuidance: {
      learningFocus: "Sequential throughput versus cluster-wide contention as concurrency rises.",
      keyKnobs: ["Stripe width", "OST count", "Network bandwidth", "Concurrent jobs"],
      expectedBehavior: "Usually highlights storage/network tradeoffs before metadata limits become central.",
      environmentGuidance:
        "Best for learning shared-scratch throughput and striping behavior; local node scratch exists in real clusters but is not a separate simulated path here.",
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
    simulationDefaults: {
      totalTicks: 360,
      tickDurationSeconds: 1,
    },
    learningGuidance: {
      learningFocus: "Checkpoint bursts, GPU utilization sensitivity, and sustained throughput under pause pressure.",
      keyKnobs: ["Checkpoint frequency", "GPU nodes", "Network bandwidth", "Concurrent jobs"],
      expectedBehavior: "Shows pause-driven write bursts where data-path limits can reduce useful training progress.",
      environmentGuidance:
        "Teaches checkpoint bursts against shared storage and network; local scratch can help staging conceptually, but shared checkpoint writes are the modeled pressure path.",
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
    simulationDefaults: {
      totalTicks: 240,
      tickDurationSeconds: 1,
    },
    learningGuidance: {
      learningFocus: "Metadata service limits under high small-file concurrency.",
      keyKnobs: ["Metadata latency", "Concurrent jobs", "File size distribution", "Compute nodes"],
      expectedBehavior: "Often increases metadata pressure and queueing when metadata service cannot keep up.",
      environmentGuidance:
        "Best for metadata-path pressure on the shared filesystem; this does not model home/lab/project storage as an independent metadata service path.",
    },
  },
] as const;

export const getHpcLabPresetById = (id: HpcLabPreset["id"]) =>
  HPC_LAB_PRESETS.find((preset) => preset.id === id);

export const getHpcLabPresetSimulationOptions = (preset: HpcLabPreset): HpcLabSimulationOptions => ({
  ...DEFAULT_HPC_LAB_SIMULATION_OPTIONS,
  ...preset.simulationDefaults,
});
