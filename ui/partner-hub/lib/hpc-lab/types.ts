export type HpcLabPresetId = "classic-hpc" | "ai-training" | "small-file";

export type HpcLabWorkloadType = "traditional-hpc" | "distributed-ai-training" | "metadata-heavy";

export type HpcLabFileSizeDistribution = "large-sequential" | "mixed" | "small-random";

export type HpcLabArchitectureMode = "hybrid-shared-cluster" | "converged-storage-services" | "dedicated-storage-layer";

export type HpcLabConceptCategory = "control" | "topology" | "metric" | "architecture";

export type HpcLabConceptId =
  | "compute-nodes"
  | "gpu-nodes"
  | "oss-count"
  | "ost-per-oss"
  | "stripe-width"
  | "metadata-latency"
  | "network-bandwidth"
  | "checkpoint-frequency"
  | "concurrent-jobs"
  | "simulation-duration"
  | "tick-duration"
  | "cpu-pool"
  | "gpu-pool"
  | "network-fabric"
  | "mds-metadata"
  | "oss-pool"
  | "total-osts"
  | "effective-stripe-width"
  | "wait-on-data"
  | "metadata-utilization"
  | "throughput-fulfillment"
  | "queue-burden"
  | "checkpoint-active-tick-share"
  | "bottleneck-transitions"
  | "longest-dominant-streak"
  | "bottleneck-confidence"
  | "dominant-time-share"
  | "shared-scratch"
  | "local-scratch"
  | "long-lived-storage"
  | "metadata-path"
  | "data-path"
  | "striped-data-path"
  | "shared-filesystem"
  | "compute-clients"
  | "ddn-exascaler-managed-lustre";

export type HpcLabConcept = {
  id: HpcLabConceptId;
  category: HpcLabConceptCategory;
  label: string;
  hoverTitle: string;
  explanation: string;
  realWorldMapping: string;
  whyItMatters: string;
  shortHint?: string;
  detailedExplanation?: string;
  modeledToday: boolean;
};

export type HpcLabStorageTier = {
  id: "node-local-scratch" | "shared-scratch" | "long-lived-storage" | "archive-storage";
  title: string;
  summary: string;
  characteristics: string[];
  simulatedToday: boolean;
};

export type HpcLabStackLayer = {
  id:
    | "login-access"
    | "scheduler-resource-allocation"
    | "compute-clients"
    | "local-scratch"
    | "shared-filesystem-metadata"
    | "shared-filesystem-data"
    | "long-lived-storage";
  title: string;
  role: string;
  simulatedToday: boolean;
};

export type HpcLabEnvironmentProfile = {
  environmentProfileId: "higher-ed-shared-cluster-hybrid";
  title: string;
  shortDescription: string;
  architectureMode: HpcLabArchitectureMode;
  architectureModePositioning: string;
  tiers: HpcLabStorageTier[];
  stackLayers: HpcLabStackLayer[];
  whatTheSimulatorModels: string[];
  whatTheSimulatorDoesNotModel: string[];
  recommendedWorkflow: string[];
  glossary: Array<{ term: string; definition: string }>;
};

export type HpcLabPresetLearningGuidance = {
  learningFocus: string;
  keyKnobs: string[];
  expectedBehavior: string;
  environmentGuidance: string;
};

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

export type HpcLabSimulationOptions = {
  tickDurationSeconds: number;
  totalTicks: number;
};

export type HpcLabPreset = {
  id: HpcLabPresetId;
  name: string;
  description: string;
  initialConfig: HpcLabConfig;
  simulationDefaults?: Partial<HpcLabSimulationOptions>;
  learningGuidance: HpcLabPresetLearningGuidance;
};

export type HpcLabNormalizedConfig = HpcLabConfig & {
  computeNodes: number;
  gpuNodes: number;
  ossCount: number;
  ostPerOss: number;
  stripeWidth: number;
  concurrentJobs: number;
  totalOsts: number;
  effectiveStripeWidth: number;
};

export type HpcLabNodeKind = "cpu" | "gpu";

export type HpcLabJobKind = "traditional-hpc" | "distributed-ai-training" | "metadata-heavy";

export type HpcLabJobState = "queued" | "running" | "completed";

export type HpcLabIoPattern = "sequential-read-heavy" | "steady-mixed-with-checkpoints" | "small-random-metadata-heavy";

export type HpcLabJobDefinition = {
  id: string;
  kind: HpcLabJobKind;
  ioPattern: HpcLabIoPattern;
  requiredCpuNodes: number;
  requiredGpuNodes: number;
  runtimeTicks: number;
  baseReadGbps: number;
  baseWriteGbps: number;
  metadataOpsPerTick: number;
  checkpointIntervalTicks: number | null;
  checkpointWriteMultiplier: number;
  checkpointPauseRatio: number;
};

export type HpcLabJobInstance = HpcLabJobDefinition & {
  state: HpcLabJobState;
  elapsedRuntimeTicks: number;
  completedWorkTicks: number;
  effectiveProgressLastTick: number;
  startTick: number | null;
  completedTick: number | null;
};

export type HpcLabSchedulerState = {
  queuedJobs: HpcLabJobInstance[];
  runningJobs: HpcLabJobInstance[];
  completedJobs: HpcLabJobInstance[];
  allocatedCpuNodes: number;
  allocatedGpuNodes: number;
};

export type HpcLabStorageRequest = {
  requestedReadGbps: number;
  requestedWriteGbps: number;
  metadataOpsRequested: number;
  stripeSeed: number;
};

export type HpcLabStorageTickState = {
  requestedReadGbps: number;
  requestedWriteGbps: number;
  deliveredReadGbps: number;
  deliveredWriteGbps: number;
  metadataOpsRequested: number;
  metadataOpsServed: number;
  metadataUtilization: number;
  ostLoadGbps: number[];
  storagePressure: number;
  metadataPressure: number;
};

export type HpcLabNetworkTickState = {
  requestedReadGbps: number;
  requestedWriteGbps: number;
  deliveredReadGbps: number;
  deliveredWriteGbps: number;
  networkUtilization: number;
  networkPressure: number;
};

export type HpcLabConstraintSignals = {
  computePressure: number;
  storagePressure: number;
  metadataPressure: number;
  networkPressure: number;
};

export type HpcLabTickSnapshot = {
  tick: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  cpuUtilization: number;
  gpuUtilization: number;
  requestedReadGbps: number;
  requestedWriteGbps: number;
  deliveredReadGbps: number;
  deliveredWriteGbps: number;
  metadataOpsRequested: number;
  metadataOpsServed: number;
  metadataUtilization: number;
  ostLoadGbps: number[];
  networkUtilization: number;
  waitOnDataRatio: number;
  checkpointActiveJobs: number;
  checkpointPauseRatio: number;
  constraintSignals: HpcLabConstraintSignals;
};

export type HpcLabSimulationSummary = {
  avgCpuUtilization: number;
  avgGpuUtilization: number;
  avgNetworkUtilization: number;
  avgWaitOnDataRatio: number;
  totalCompletedJobs: number;
  peakQueuedJobs: number;
  avgDeliveredReadGbps: number;
  avgDeliveredWriteGbps: number;
  avgMetadataUtilization: number;
  totalEffectiveWorkTicks: number;
  avgCompletedWorkRatio: number;
  avgCheckpointPauseRatio: number;
};

export type HpcLabSimulationResult = {
  normalizedConfig: HpcLabNormalizedConfig;
  options: HpcLabSimulationOptions;
  timeline: HpcLabTickSnapshot[];
  jobs: HpcLabJobInstance[];
  summary: HpcLabSimulationSummary;
  assumptions: string[];
};

export type HpcLabBottleneckKind = "compute" | "storage" | "metadata" | "network" | "mixed" | "balanced";

export type HpcLabBottleneckConfidence = "low" | "medium" | "high";

export type HpcLabTickBottleneckAttribution = {
  tick: number;
  kind: HpcLabBottleneckKind;
  dominantPressure: number;
  marginToNext: number;
};

export type HpcLabDerivedRunMetrics = {
  throughputFulfillmentRatio: number;
  metadataServiceRatio: number;
  queueBurdenRatio: number;
  checkpointActiveTickShare: number;
  bottleneckTransitionCount: number;
  longestDominantStreak: number;
};

export type HpcLabRunBottleneckAttribution = {
  dominantKind: HpcLabBottleneckKind;
  confidence: HpcLabBottleneckConfidence;
  confidenceScore: number;
  dominantTimeShare: number;
  timeShareByKind: Record<HpcLabBottleneckKind, number>;
  perTick: HpcLabTickBottleneckAttribution[];
  derivedMetrics: HpcLabDerivedRunMetrics;
  bottleneckTransitionCount: number;
  longestDominantStreak: number;
  explanation: string;
  nextSteps: string[];
};

export type HpcLabWalkthroughEvidenceFormat = "percent" | "count";

export type HpcLabWalkthroughEvidenceItem = {
  metric: string;
  label: string;
  value: number;
  format: HpcLabWalkthroughEvidenceFormat;
  interpretation: string;
};

export type HpcLabWalkthroughExperiment = {
  title: string;
  change: string;
  reason: string;
};

export type HpcLabGuidedWalkthrough = {
  headline: string;
  whatHappened: string;
  whyItHappened: string;
  whatToLearn: string;
  environmentContext: string;
  nextExperiments: HpcLabWalkthroughExperiment[];
  evidence: HpcLabWalkthroughEvidenceItem[];
  runCaveats: string[];
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

export type HpcLabChartPoint = {
  tick: number;
  value: number;
};

export type HpcLabLineSeries = {
  key: string;
  label: string;
  points: HpcLabChartPoint[];
};

export type HpcLabLineChartModel = {
  title: string;
  subtitle?: string;
  yAxisLabel: string;
  valueFormat: "percent" | "gbps" | "ops" | "count" | "decimal";
  series: HpcLabLineSeries[];
  downsampled: boolean;
  sourcePoints: number;
  renderedPoints: number;
};

export type HpcLabBarDatum = {
  label: string;
  value: number;
};

export type HpcLabBarChartModel = {
  title: string;
  subtitle?: string;
  yAxisLabel: string;
  valueFormat: "percent" | "gbps" | "ops" | "count" | "decimal";
  bars: HpcLabBarDatum[];
};

export type HpcLabTopologyModel = {
  cpuNodes: number;
  gpuNodes: number;
  ossCount: number;
  totalOsts: number;
  effectiveStripeWidth: number;
  networkBandwidthGbps: number;
  metadataLatencyMs: number;
};
