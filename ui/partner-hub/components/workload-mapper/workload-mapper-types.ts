export type WorkloadCategory = "FSI" | "HPC / AI" | "Custom";

export type AiPattern =
  | "RAG"
  | "Fine-tuning"
  | "Training from scratch"
  | "Inference only"
  | "Analytics / ML pipeline"
  | "HPC simulation"
  | "Not sure yet";

export type PerformanceTier = "real-time" | "near real-time" | "intraday" | "batch/end-of-day";

export type SizingInputKey =
  | "exactDataVolume"
  | "dailyIngestRate"
  | "fileObjectCount"
  | "queryConcurrency"
  | "modelSize"
  | "gpuRequirement"
  | "retentionPeriod"
  | "haDrRequirements"
  | "preferredVendors"
  | "budgetTimeline";

export interface WorkloadTemplate {
  id: string;
  name: string;
  category: WorkloadCategory;
  description: string;
  defaultPattern: AiPattern;
  defaultPressurePoints: string[];
  assumptions: string[];
}

export interface WorkloadFormState {
  workloadName: string;
  selectedWorkloadId: string;
  processImproved: string;
  successCriteria: string;
  aiPattern: AiPattern;
  dataTypes: string[];
  dataSizeRange: string;
  dailyIngestRange: string;
  filePattern: string;
  freshnessRequirement: string;
  performanceTier: PerformanceTier;
  queryConcurrency: string;
  gpuDependency: string;
  latencyRequirement: string;
  dataSensitivity: string;
  auditTrail: string;
  encryption: string;
  dataResidency: string;
  retention: string;
  explainability: string;
  accessControls: string;
  sizingInputs: Record<SizingInputKey, string>;
}

export interface SizingField {
  key: SizingInputKey;
  label: string;
  whyItMatters: string;
}

export interface WorkloadProfile {
  classification: string;
  pressurePoints: string[];
  architectureSteps: string[];
  buildingBlocks: Record<string, string[]>;
  readinessPercent: number;
  knownInputs: Array<{ label: string; value: string }>;
  missingInputs: Array<{ label: string; whyItMatters: string }>;
  whyDdn: string[];
}

export interface WorkloadExamplePreset {
  workloadName?: string;
  processImproved: string;
  successCriteria: string;
  aiPattern: AiPattern;
  dataTypes: string[];
  dataSizeRange: string;
  dailyIngestRange: string;
  filePattern: string;
  freshnessRequirement: string;
  performanceTier: PerformanceTier;
  queryConcurrency: string;
  gpuDependency: string;
  latencyRequirement: string;
  dataSensitivity: string;
  auditTrail: string;
  encryption: string;
  dataResidency: string;
  retention: string;
  explainability: string;
  accessControls: string;
  sizingInputs: Record<SizingInputKey, string>;
}
