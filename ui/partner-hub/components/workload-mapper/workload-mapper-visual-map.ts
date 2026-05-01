import type { WorkloadFormState, WorkloadTemplate } from "./workload-mapper-types";

export interface VisualMapNode {
  id: string;
  title: string;
  plainEnglish: string;
  examples?: string[];
  ddnFit?: boolean;
}

export interface VisualMap {
  title: string;
  businessGoal: string;
  nodes: VisualMapNode[];
  governance: string[];
  ddnFitHighlights: string[];
  outcome: string;
  validationFocus: string[];
}

interface BuildVisualMapArgs {
  workloadId: string;
  selectedWorkload?: WorkloadTemplate;
  state: WorkloadFormState;
  ddnReferencePattern: string;
}

const flowNode = (
  id: string,
  title: string,
  plainEnglish: string,
  options?: { examples?: string[]; ddnFit?: boolean },
): VisualMapNode => ({ id, title, plainEnglish, examples: options?.examples, ddnFit: options?.ddnFit });

const genericGovernance = (state: WorkloadFormState): string[] => [
  `${state.auditTrail} audit trail`,
  `${state.encryption} encryption`,
  `${state.dataResidency} data residency`,
  `${state.accessControls} access model`,
  `${state.explainability} explainability`,
  `${state.retention || "Policy-based"} retention`,
];

const maps: Record<string, Omit<VisualMap, "title">> = {
  fraud: {
    businessGoal: "Reduce fraud exposure, lower false positives, and speed investigation decisions.",
    nodes: [
      flowNode("data", "Data sources", "Collect fraud evidence from payments, accounts, and case systems.", { examples: ["Transaction events", "Identity/device signals", "Historical fraud cases", "Investigation notes + policy/rules"], ddnFit: true }),
      flowNode("pipeline", "Ingestion + preparation", "Ingest streams, normalize entities, index records, and chunk/embed unstructured case evidence.", { ddnFit: true }),
      flowNode("platform", "Active data platform", "Maintain a high-performance active fraud data layer for scoring and investigations.", { examples: ["52 TB active + 18 TB governed archive", "0.8-1.6 TB/day ingest", "~6B transaction rows + 12M case artifacts"], ddnFit: true }),
      flowNode("ai", "AI / analytics / scoring", "Run anomaly detection, fraud scoring, and reasoning assistant flows on GPU inference.", { examples: ["Anomaly models", "Fraud scoring APIs", "8B-13B investigation assistant"], ddnFit: true }),
      flowNode("retrieval", "Retrieval + context", "Pull investigator context with related accounts, prior cases, policy evidence, and transaction history.", { ddnFit: true }),
      flowNode("app", "Business app workflow", "Enable alert triage, case investigation, assistant-guided review, and dashboard/API operations.")
    ],
    governance: [
      "Strict audit trail",
      "Encryption at rest and in transit",
      "Regional data residency",
      "RBAC + ABAC controls",
      "Model explainability",
      "7-year retention",
      "HA/DR: active-active scoring endpoints + cross-region governed data replication",
    ],
    ddnFitHighlights: [
      "DDN-relevant data path for active fraud datasets",
      "DDN-relevant metadata/indexing at high object scale",
      "DDN-relevant high-throughput ingest (0.8-1.6 TB/day)",
      "DDN-relevant low-latency retrieval and scoring",
      "DDN-relevant governed access and audit continuity",
      "DDN-relevant HA/DR data continuity",
    ],
    outcome: "Fewer false positives, faster investigation cycle time, and higher fraud-response confidence.",
    validationFocus: ["False-positive rate reduction", "p95 scoring and retrieval latency", "Investigation cycle-time improvement", "Governance evidence completeness"],
  },
};

const workloadSpecificGoals: Record<string, string> = {
  risk: "Run stress scenarios faster with reproducible evidence for risk and capital decisions.",
  trading: "Accelerate quant research iteration while preserving low-latency data access.",
  compliance: "Extract obligations and evidence with explainable, policy-grounded responses.",
  "fsi-rag": "Improve secure knowledge retrieval quality for frontline and operations teams.",
  "fsi-ft": "Fine-tune domain models with governed datasets and reproducible training runs.",
  "ai-training": "Train large models at sustained throughput with reliable checkpoint and recovery paths.",
  inference: "Serve high-concurrency inference APIs with predictable latency and guardrails.",
  simulation: "Increase simulation throughput and shorten time-to-insight after job completion.",
  genomics: "Scale genomics pipelines and interpretation under regulated reproducibility controls.",
  media: "Meet media/rendering deadlines with high-throughput pipelines and scalable inferencing.",
};

const genericNodes = (state: WorkloadFormState): VisualMapNode[] => [
  flowNode("data", "Data sources", "Bring together operational, historical, and contextual data used by this workload.", { examples: state.dataTypes.length ? state.dataTypes.map((d) => `${d} data`) : undefined }),
  flowNode("pipeline", "Pipeline / processing", "Ingest, clean, normalize, and prepare data for analytics or model execution.", { ddnFit: true }),
  flowNode("platform", "Data platform", "Host active datasets with performance and durability aligned to workload demands.", { examples: [state.sizingInputs.exactDataVolume || state.dataSizeRange || "Capacity defined during discovery"], ddnFit: true }),
  flowNode("ai", "AI / analytics / model serving", "Execute training, analytics, or inference flows tied to the selected AI pattern.", { examples: [state.aiPattern], ddnFit: true }),
  flowNode("app", "Business application / workflow", "Surface outputs to analysts, operators, or APIs that drive business decisions."),
];

export function buildWorkloadVisualMap({ workloadId, selectedWorkload, state, ddnReferencePattern }: BuildVisualMapArgs): VisualMap {
  if (maps[workloadId]) {
    return { title: `${selectedWorkload?.name ?? "Workload"} Visual Map`, ...maps[workloadId] };
  }

  const businessGoal = workloadSpecificGoals[workloadId] ?? state.processImproved || selectedWorkload?.description || "Clarify the business workflow and define measurable outcomes.";

  return {
    title: `${selectedWorkload?.name ?? state.workloadName || "Custom Workload"} Visual Map`,
    businessGoal,
    nodes: genericNodes(state),
    governance: genericGovernance(state),
    ddnFitHighlights: [
      "DDN-relevant data path for active and governed tiers",
      "DDN-relevant metadata/indexing for fast retrieval",
      "DDN-relevant throughput and latency performance",
      "DDN-relevant checkpoint/training data path where applicable",
      "DDN-relevant governed access and audit controls",
      `Reference pattern: ${ddnReferencePattern}`,
    ],
    outcome: state.successCriteria || "Business workflow executes faster with stronger confidence, controls, and operational resilience.",
    validationFocus: ["Business KPI improvement", "Latency/throughput target attainment", "Governance and retention evidence", "HA/DR and continuity readiness"],
  };
}
