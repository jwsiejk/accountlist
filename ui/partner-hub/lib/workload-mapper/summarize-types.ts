import type { WorkloadFormState, WorkloadTemplate } from "@/components/workload-mapper/workload-mapper-types";

export interface WorkloadSelectionContext {
  id: string;
  name: string;
  category: string;
  description: string;
  assumptions?: string;
  pressurePoints?: string;
  isCustom: boolean;
}

export interface DdnBuildingBlockSummary {
  name: string;
  whatItDoes: string;
  whyItFits: string;
  capturedInputSignals: string[];
  validationQuestions: string[];
}

export interface DdnReferencePatternSummary {
  workloadId: string;
  closestDdnPattern: string;
  mappingConfidence: "Low" | "Medium" | "High";
  sourceBasis: string[];
  buildingBlocks: DdnBuildingBlockSummary[];
  validationBeforeBom: string[];
  summaryGuidance: string[];
}

export interface WorkloadSummaryRequest {
  workload: WorkloadSelectionContext;
  customWorkload: {
    category: string;
    description: string;
    assumptions: string;
    pressurePoints: string;
  };
  questionnaire: WorkloadFormState;
  knownInputs: Array<{ label: string; value: string }>;
  missingInputs: Array<{ label: string; whyItMatters: string }>;
  architecturePipeline: string[];
  buildingBlocks: Record<string, string[]>;
  ddnReferencePattern: DdnReferencePatternSummary;
}


export interface WorkloadSummaryResponse {
  summary: string;
}

export function toSelectionContext(selected: WorkloadTemplate | undefined, state: WorkloadFormState, custom: WorkloadSummaryRequest["customWorkload"]): WorkloadSelectionContext {
  const isCustom = state.selectedWorkloadId === "custom";
  return {
    id: isCustom ? "custom" : state.selectedWorkloadId,
    name: isCustom ? state.workloadName || "Custom workload" : selected?.name || "Unknown workload",
    category: isCustom ? custom.category : selected?.category || "Unknown",
    description: isCustom ? custom.description : selected?.description || "",
    assumptions: isCustom ? custom.assumptions : selected?.assumptions.join(", "),
    pressurePoints: isCustom ? custom.pressurePoints : selected?.defaultPressurePoints.join(", "),
    isCustom,
  };
}
