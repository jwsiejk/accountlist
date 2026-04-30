import { architecturePatterns, sizingFields, workloadLibrary } from "./workload-mapper-data";
import { WorkloadFormState, WorkloadProfile } from "./workload-mapper-types";

const hasValue = (value: string) => value.trim().length > 0;

export function getSelectedWorkload(selectedWorkloadId: string) {
  return workloadLibrary.find((workload) => workload.id === selectedWorkloadId);
}

export function buildWorkloadProfile(state: WorkloadFormState): WorkloadProfile {
  const selectedWorkload = getSelectedWorkload(state.selectedWorkloadId);
  const sensitivity = state.dataSensitivity || "moderate-sensitivity";
  const performance = state.performanceTier || "batch/end-of-day";
  const pattern = state.aiPattern === "Not sure yet" ? selectedWorkload?.defaultPattern ?? "Analytics / ML pipeline" : state.aiPattern;

  const classification = `${sensitivity}, ${performance} ${pattern} workload`;
  const inferredPressurePoints = [
    ...(selectedWorkload?.defaultPressurePoints ?? []),
    ...(hasValue(state.dailyIngestRange) ? ["data ingestion velocity"] : []),
    ...(hasValue(state.freshnessRequirement) ? ["retrieval freshness"] : []),
    ...(hasValue(state.queryConcurrency) ? ["parallel data access"] : []),
    ...(state.gpuDependency.toLowerCase().includes("high") ? ["GPU utilization"] : []),
    ...(state.auditTrail.toLowerCase().includes("strict") ? ["governance and auditability"] : []),
  ];

  const pressurePoints = [...new Set(inferredPressurePoints)].slice(0, 7);
  const architectureSteps = architecturePatterns[pattern] ?? architecturePatterns["Analytics / ML pipeline"];

  const buildingBlocks: Record<string, string[]> = {
    Compute: ["General compute cluster for orchestration", "Accelerated compute pool sized during design", "Autoscaling policy for peaks"],
    "Storage / Data Platform": ["High-throughput primary data platform", "Object + file data tiering", "Snapshot and lifecycle management"],
    Network: ["Low-latency east-west fabric", "Segmentation for sensitive data zones", "Performance telemetry for bottleneck isolation"],
    "AI Software": ["Model lifecycle tooling", "Prompt/feature pipeline services", "Evaluation and observability controls"],
    "Security / Governance": ["Encryption at rest and in transit", "Centralized audit logging", "Policy-based access controls and explainability workflow"],
    Services: ["Architecture workshops", "Sizing and benchmark plan", "Operational readiness and runbook design"],
  };

  const knownInputs = sizingFields
    .filter((field) => hasValue(state.sizingInputs[field.key]))
    .map((field) => ({ label: field.label, value: state.sizingInputs[field.key] }));

  const missingInputs = sizingFields
    .filter((field) => !hasValue(state.sizingInputs[field.key]))
    .map((field) => ({ label: field.label, whyItMatters: field.whyItMatters }));

  const readinessPercent = Math.round((knownInputs.length / sizingFields.length) * 100);

  const talkTrack = [
    `We are mapping ${state.workloadName || selectedWorkload?.name || "this workload"} as a ${classification}.`,
    `The main pressure points are ${pressurePoints.join(", ") || "to be validated during discovery"}, which shapes architecture priorities.`,
    `Before any BOM proposal, we should close ${missingInputs.length} sizing gaps to reduce risk in performance, cost, and governance assumptions.`,
    "This output is a discovery accelerant: it highlights likely building blocks and decision checkpoints, not an automatic BOM generator.",
  ];

  return {
    classification,
    pressurePoints,
    architectureSteps,
    buildingBlocks,
    readinessPercent,
    knownInputs,
    missingInputs,
    talkTrack,
  };
}
