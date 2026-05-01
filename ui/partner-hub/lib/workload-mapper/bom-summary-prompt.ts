import type { BomSummaryRequest } from "./summarize-types";

const workloadBomFocus: Record<string, string> = {
  "Risk Modeling / Stress Testing": "Map the narrative to governed historical risk data, scenario pipeline flow, parallel analytics, scenario result aggregation, lineage/reproducibility controls, and batch/intraday performance validation.",
  "Trading / Quant Research": "Map the narrative to a time-series/feature active platform, high-concurrency research access, metadata/indexing for features and backtests, analytics/backtesting execution, low-latency validation, and governance for proprietary strategy data.",
  "Compliance / Document Intelligence": "Map the narrative to governed document ingest, chunking/embedding, metadata indexing, vector retrieval, explainability/evidence flow, and security/residency/audit/access controls.",
  "RAG Knowledge Assistant": "Map the narrative to enterprise knowledge ingestion, metadata/indexing, embedding/vector retrieval, model serving/inference, RBAC/ABAC access, and retrieval freshness validation.",
  "Model Training / Fine-tuning": "Map the narrative to curated fine-tuning data, training/validation execution, checkpoint/model registry, high-throughput training data path, GPU fine-tuning compute, and benchmark validation before BOM.",
  "Large-scale AI Training": "Map the narrative to corpus ingest/preparation, distributed training data path, checkpoint/recovery, AI-factory GPU training compute, high-speed fabric, and GPU utilization/throughput validation.",
  "Inference Platform": "Map the narrative to model serving/routing, hot feature access, policy/safety/observability, cache/session state, multi-tenant governance/security, and latency/concurrency validation.",
  "Scientific Simulation": "Map the narrative to scheduler-integrated HPC compute, EXAScaler-style parallel data platform, checkpoint/output handling, high-speed interconnect, post-processing/visualization, and job profile validation.",
  "Genomics / Life Sciences": "Map the narrative to sequencing/pipeline ingest, metadata for high small-file counts, high-throughput pipeline data flow, analytics/AI interpretation, governance/retention/reproducibility, and regulated data access controls.",
  "Media / Rendering Pipeline": "Map the narrative to high-throughput shared assets, metadata/indexing for media, GPU render/inference pools, workflow orchestration queues, burst-ingest validation, and project-level access/archive policy.",
};

export function buildBomSummaryPrompt(input: BomSummaryRequest): string {
  const workloadName = input.customWorkload?.workloadName?.trim() || input.workload.name;
  const focusDirective = workloadBomFocus[workloadName];
  const bomSummaryContext = {
    workload: input.workload,
    customWorkload: input.customWorkload,
    questionnaire: input.questionnaire,
    knownInputs: input.knownInputs,
    missingInputs: input.missingInputs,
    ddnReferencePattern: input.ddnReferencePattern,
  };

  return [
    "You are generating a BOM-readiness architecture summary for an AI workload discovery workflow.",
    "Use only the provided structured input and write in plain English.",
    "Opening disclaimer must be exactly:",
    "This is not a final BOM. It is a DDN-informed architecture mapping based on the current workload inputs.",
    "End with this exact closing note:",
    "This is an example starting point based on current DDN public reference architecture and platform themes. Actual sizing and final BOM require DDN/customer-specific validation, benchmark expectations, and constraints.",
    "Treat ddnReferencePattern.buildingBlocks as the primary source for solution-shape building blocks whenever present.",
    "Synthesize those building blocks into cohesive architecture paragraphs, and combine closely related blocks when it reads naturally.",
    "Do NOT render the response as a field-by-field dump, checklist, or reference-map object.",
    "Do NOT use repeated labels/headings like 'What it does', 'Why it fits', 'Captured input signals', or 'Validation questions'.",
    "Do NOT expose internal field names from the payload. Use captured values naturally in sentences (for example, describe ingest rates, concurrency, model ranges, retention, latency, governance, and HA/DR expectations in plain language).",
    "Start with a concise closest-pattern paragraph that explicitly uses concrete captured values when available.",
    "Then explain the DDN-informed architecture building blocks as narrative paragraphs in the same overall sequence as ddnReferencePattern.buildingBlocks.",
    "Include validation needs naturally in the narrative and finish with a concise final validation paragraph before the closing note.",
    ...(focusDirective ? [focusDirective] : []),
    "Guardrails: Do NOT output an actual BOM, exact SKU recommendations, node counts, GPU counts, pricing, quotes, or final sizing.",
    "Do not claim official one-to-one DDN BOM mapping certainty.",
    "Structured context:",
    JSON.stringify(bomSummaryContext, null, 2),
  ].join("\n");
}
