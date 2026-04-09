import type { HpcLabBottleneckKind, HpcLabEnvironmentProfile, HpcLabRunBottleneckAttribution } from "./types";

const ARCHITECTURE_MODE_LABELS: Record<HpcLabEnvironmentProfile["architectureMode"], string> = {
  "hybrid-shared-cluster": "Hybrid shared cluster",
  "converged-storage-services": "Converged storage services",
  "dedicated-storage-layer": "Dedicated storage layer",
};

export const DEFAULT_HPC_LAB_ENVIRONMENT_PROFILE: HpcLabEnvironmentProfile = {
  environmentProfileId: "higher-ed-shared-cluster-hybrid",
  title: "Higher-ed shared cluster (hybrid)",
  shortDescription:
    "A common higher-ed layout where compute nodes use local scratch, a shared parallel filesystem handles active shared work, and home/lab/project spaces hold longer-lived data.",
  architectureMode: "hybrid-shared-cluster",
  architectureModePositioning:
    "This lab view is closer to a dedicated shared storage layer than a fully converged design, even though campuses can implement variants.",
  tiers: [
    {
      id: "node-local-scratch",
      title: "Node-local scratch",
      summary: "Fast temporary space on each compute node. Not shared across nodes.",
      characteristics: [
        "Per-node and short-lived",
        "Useful for staging and temporary spill",
        "Not a shared parallel filesystem namespace",
      ],
      simulatedToday: false,
    },
    {
      id: "shared-scratch",
      title: "Shared scratch / parallel filesystem",
      summary: "Shared high-performance workspace visible from many compute nodes for active jobs.",
      characteristics: [
        "Parallel namespace across compute clients",
        "Includes metadata path and striped data path",
        "Primary active I/O surface in this simulator",
      ],
      simulatedToday: true,
    },
    {
      id: "long-lived-storage",
      title: "Home / lab / project storage",
      summary: "Longer-lived collaborative storage for reproducibility and handoff, separate from scratch semantics.",
      characteristics: [
        "Policy-driven retention",
        "Often lower performance than shared scratch",
        "Modeled conceptually but not as a separate engine path",
      ],
      simulatedToday: false,
    },
    {
      id: "archive-storage",
      title: "Archive / cold storage (optional)",
      summary: "Future or external archival tier for long-term retention and infrequent access.",
      characteristics: ["Usually asynchronous to active jobs", "Not represented in the current deterministic run model"],
      simulatedToday: false,
    },
  ],
  stackLayers: [
    {
      id: "login-access",
      title: "Login / access layer",
      role: "Users enter through login or gateway services before submitting jobs.",
      simulatedToday: false,
    },
    {
      id: "scheduler-resource-allocation",
      title: "Scheduler / resource allocation layer",
      role: "Allocates CPU/GPU resources and determines when queued jobs can run.",
      simulatedToday: true,
    },
    {
      id: "compute-clients",
      title: "Compute nodes (clients)",
      role: "Compute nodes are clients of shared storage and network services.",
      simulatedToday: true,
    },
    {
      id: "local-scratch",
      title: "Local scratch (per node)",
      role: "Temporary node-local path for per-node staging or scratch operations.",
      simulatedToday: false,
    },
    {
      id: "shared-filesystem-metadata",
      title: "Shared filesystem metadata path",
      role: "Controls file namespace operations and metadata service limits.",
      simulatedToday: true,
    },
    {
      id: "shared-filesystem-data",
      title: "Shared filesystem data path (striped)",
      role: "Carries striped read/write data traffic across storage targets.",
      simulatedToday: true,
    },
    {
      id: "long-lived-storage",
      title: "Long-lived home/lab/project layer",
      role: "Holds durable datasets and outputs outside short-lived scratch workflows.",
      simulatedToday: false,
    },
  ],
  whatTheSimulatorModels: [
    "Scheduler admission and compute client pressure.",
    "Shared filesystem metadata service behavior.",
    "Shared striped data-path throughput behavior and striping effects.",
    "Aggregate network delivery limits between compute clients and shared storage.",
  ],
  whatTheSimulatorDoesNotModel: [
    "A separate local-scratch I/O path with independent performance physics.",
    "A distinct home/lab/project performance path with retention-policy effects.",
    "Archive/cold storage retrieval workflows.",
    "Institution-specific topology or vendor-specific implementation details.",
  ],
  recommendedWorkflow: [
    "Read tier and stack context before changing knobs.",
    "Run a preset, then use bottleneck evidence to identify whether pressure is on shared metadata, shared data, network, or scheduler admission.",
    "Change one control at a time and compare deterministic outputs.",
  ],
  glossary: [
    {
      term: "Node-local scratch",
      definition: "Temporary storage local to one compute node; fast but not shared cluster-wide.",
    },
    {
      term: "Shared scratch / parallel filesystem",
      definition: "Shared high-performance workspace that many compute nodes access concurrently.",
    },
    {
      term: "Metadata path",
      definition: "Control path for file and namespace operations.",
    },
    {
      term: "Data path",
      definition: "Read/write payload path, often striped across storage targets.",
    },
    {
      term: "Home/lab/project storage",
      definition: "Longer-lived storage spaces for durable data management and collaboration.",
    },
  ],
};

export const getHpcLabEnvironmentProfile = (): HpcLabEnvironmentProfile => DEFAULT_HPC_LAB_ENVIRONMENT_PROFILE;

export const getArchitectureModeLabel = (mode: HpcLabEnvironmentProfile["architectureMode"]): string => ARCHITECTURE_MODE_LABELS[mode];

const SHARED_PATH_CONTEXT_BY_BOTTLENECK: Record<HpcLabBottleneckKind, string> = {
  compute: "This run was shaped most by scheduler/compute admission, not a local-scratch model.",
  storage: "This run is mainly about the shared filesystem data path, not node-local scratch.",
  metadata: "This run is mainly about the shared filesystem metadata control path.",
  network: "This run shows shared-path delivery limits between compute clients and shared storage.",
  mixed: "This run mixes shared-path and scheduler pressures; isolate one variable per rerun.",
  balanced: "This run showed no single dominant limiter, so use controlled stress changes to surface one.",
};

export const buildEnvironmentResultContext = (attribution: HpcLabRunBottleneckAttribution): string => {
  const modeLabel = getArchitectureModeLabel(DEFAULT_HPC_LAB_ENVIRONMENT_PROFILE.architectureMode);
  return `${SHARED_PATH_CONTEXT_BY_BOTTLENECK[attribution.dominantKind]} Environment framing: ${modeLabel} with explicit local scratch and long-lived storage concepts.`;
};
