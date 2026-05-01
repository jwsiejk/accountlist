import type { DdnWorkloadReferencePattern } from "./workload-mapper-ddn-reference";
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
  ddnReferencePattern: DdnWorkloadReferencePattern;
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
      flowNode("pipeline", "Ingestion + prep", "Ingest streams, normalize entities, index records, and chunk/embed case evidence.", { ddnFit: true }),
      flowNode("platform", "Active fraud platform", "Maintain a high-performance active fraud data layer for scoring and investigations.", { examples: ["52 TB active + 18 TB archive", "0.8-1.6 TB/day ingest", "~6B transactions + 12M case artifacts"], ddnFit: true }),
      flowNode("ai", "Scoring + analytics", "Run anomaly detection, fraud scoring, and assistant-supported investigation analysis.", { examples: ["Anomaly models", "Fraud scoring APIs", "Investigator assistant"], ddnFit: true }),
      flowNode("retrieval", "Context retrieval", "Pull related accounts, prior cases, and policy evidence for investigator context.", { ddnFit: true }),
      flowNode("app", "Investigation workflow", "Enable alert triage, case decisions, and dashboard/API operations."),
    ],
    governance: ["Strict audit trail", "Encryption at rest and in transit", "Regional data residency", "RBAC + ABAC controls", "Model explainability", "7-year retention", "HA/DR continuity"],
    ddnFitHighlights: ["High-throughput ingest and active fraud data path", "Low-latency scoring and retrieval", "Metadata/indexing at large object scale", "Governed access and audit continuity"],
    outcome: "Fewer false positives, faster investigation cycles, and higher decision confidence.",
    validationFocus: ["False-positive reduction", "p95 scoring + retrieval latency", "Investigation cycle-time improvement", "Governance evidence completeness"],
  },
  risk: {
    businessGoal: "Compress risk windows and improve portfolio exposure visibility.",
    nodes: [
      flowNode("data", "Market + portfolio data", "Consolidate pricing, positions, exposures, and historical risk factors.", { ddnFit: true }),
      flowNode("scenario", "Scenario prep", "Generate and stage stress scenarios and assumptions for model runs."),
      flowNode("platform", "Governed risk platform", "Provide a reproducible shared risk data layer for analytics and scenario outputs.", { ddnFit: true }),
      flowNode("compute", "Parallel analytics", "Run concurrent VaR/stress calculations across portfolios and scenarios.", { ddnFit: true }),
      flowNode("report", "Aggregation + reporting", "Aggregate outputs into exposure views, limits reporting, and management packs."),
      flowNode("decision", "Risk decisions", "Feed committees and desk workflows with explainable risk results."),
    ],
    governance: ["Dataset and model lineage", "Reproducible scenario runs", "Audit-ready evidence", "Policy retention", "Model governance controls"],
    ddnFitHighlights: ["High-throughput shared risk data", "Parallel read/write behavior for stress runs", "Scenario output handling and replay", "Reproducibility for model-risk review"],
    outcome: "Faster stress-cycle completion with clearer exposure decisions.",
    validationFocus: ["Batch/intraday risk window adherence", "Parallel runtime scaling", "Scenario replay fidelity", "Governance completeness"],
  },
  trading: {
    businessGoal: "Validate trading ideas and signals faster.",
    nodes: [
      flowNode("data", "Market + alt data", "Collect market, time-series, and alternative feeds used by quant research.", { ddnFit: true }),
      flowNode("feature", "Feature prep", "Build and refresh candidate features and labels for strategy testing."),
      flowNode("platform", "Feature/time-series platform", "Maintain active hot datasets with reusable metadata and indexing.", { ddnFit: true }),
      flowNode("backtest", "Backtesting execution", "Run large backtest sweeps and parameter experiments in parallel.", { ddnFit: true }),
      flowNode("research", "Research notebooks/jobs", "Support interactive and scheduled quant workflows for analysts."),
      flowNode("decision", "Strategy decisions", "Promote validated signals into desk decision workflows."),
    ],
    governance: ["Proprietary strategy access control", "Desk-level RBAC/ABAC", "Research retention policy"],
    ddnFitHighlights: ["Low-latency hot reads for active features", "High-concurrency backtesting access", "Metadata/indexing for strategy reuse", "Shared data path across teams"],
    outcome: "More research iterations per cycle with faster strategy validation.",
    validationFocus: ["Backtest turnaround time", "Concurrent user/job behavior", "Hot dataset latency", "Access-policy enforcement"],
  },
  compliance: {
    businessGoal: "Reduce manual review and improve audit/regulatory response.",
    nodes: [
      flowNode("sources", "Policies + evidence", "Gather regulations, policies, controls, and supporting evidence artifacts.", { ddnFit: true }),
      flowNode("ingest", "Document ingest", "Normalize and classify incoming documents from compliance systems."),
      flowNode("embed", "Chunk + embed", "Prepare chunked text and embeddings for traceable retrieval."),
      flowNode("metadata", "Metadata + indexing", "Track document lineage, jurisdiction tags, and control mappings.", { ddnFit: true }),
      flowNode("retrieve", "Vector retrieval", "Retrieve policy-grounded passages for investigator and reviewer prompts.", { ddnFit: true }),
      flowNode("app", "Compliance review app", "Present evidence-backed responses for review, filing, and audit follow-up."),
    ],
    governance: ["Audit-ready trace", "Residency controls", "Explainable citations", "Legal hold support", "Retention policy"],
    ddnFitHighlights: ["Many-document ingest and lifecycle support", "Metadata/indexing for governed filtering", "Retrieval freshness and citation context", "Governed access for sensitive evidence"],
    outcome: "Lower review effort and quicker, defensible regulatory responses.",
    validationFocus: ["Citation accuracy", "Retrieval freshness SLA", "Review cycle-time reduction", "Audit export completeness"],
  },
  "fsi-rag": {
    businessGoal: "Help employees find trusted answers faster.",
    nodes: [
      flowNode("sources", "Knowledge sources", "Unify policies, SOPs, product docs, and enterprise knowledge content.", { ddnFit: true }),
      flowNode("ingest", "Ingestion + normalization", "Clean and normalize content into a governed RAG-ready format."),
      flowNode("embed", "Chunk + embed", "Generate chunk and embedding representations for semantic retrieval."),
      flowNode("retrieve", "Vector retrieval", "Return the most relevant grounded context for employee questions.", { ddnFit: true }),
      flowNode("serve", "Model serving", "Run response generation with prompt controls and guardrails."),
      flowNode("app", "Employee assistant", "Deliver answers in chat/search experiences with citations."),
    ],
    governance: ["RBAC/ABAC policy enforcement", "Sensitivity labels", "Query and answer audit trails"],
    ddnFitHighlights: ["Fresh retrieval from continuously updated content", "Metadata/indexing for relevance and filtering", "Governed access to internal knowledge"],
    outcome: "Faster self-service answers with stronger trust in source-backed responses.",
    validationFocus: ["Answer relevance/grounding", "Freshness lag from source update", "Assistant latency targets", "Policy enforcement evidence"],
  },
  "fsi-ft": {
    businessGoal: "Adapt models to domain language and processes.",
    nodes: [
      flowNode("corpus", "Training corpus", "Assemble curated domain examples and conversation/task datasets.", { ddnFit: true }),
      flowNode("quality", "Quality + labeling", "Apply quality gates, labeling checks, and policy filters."),
      flowNode("platform", "Training data layer", "Provide high-throughput governed data delivery to fine-tuning jobs.", { ddnFit: true }),
      flowNode("jobs", "GPU fine-tuning jobs", "Run iterative tuning experiments across model variants.", { ddnFit: true }),
      flowNode("registry", "Checkpoint + registry", "Track checkpoints, metrics, and promoted model artifacts.", { ddnFit: true }),
      flowNode("deploy", "Deploy + evaluate", "Deploy candidate models and evaluate task/domain performance."),
    ],
    governance: ["Dataset lineage", "Experiment auditability", "Reproducible training runs"],
    ddnFitHighlights: ["Training data throughput to GPUs", "Checkpoint/artifact lifecycle handling", "Repeatable experiment data paths"],
    outcome: "Higher domain fit with controlled and repeatable tuning operations.",
    validationFocus: ["Fine-tune cycle time", "GPU data feed efficiency", "Checkpoint recovery behavior", "Model-quality acceptance gates"],
  },
  "ai-training": {
    businessGoal: "Build differentiated AI capabilities.",
    nodes: [
      flowNode("corpus", "Large corpus", "Aggregate large multi-source datasets for foundation-scale training.", { ddnFit: true }),
      flowNode("prep", "Preprocessing pipeline", "Tokenize, filter, and transform data into trainable shards."),
      flowNode("platform", "High-perf data layer", "Sustain high-throughput shared access for distributed training.", { ddnFit: true }),
      flowNode("train", "Distributed GPU training", "Run large distributed training jobs across GPU clusters.", { ddnFit: true }),
      flowNode("checkpoint", "Checkpoint + recovery", "Persist frequent checkpoints for restart and risk mitigation.", { ddnFit: true }),
      flowNode("registry", "Registry + evaluation", "Track artifact lineage and evaluation before promotion."),
    ],
    governance: ["Dataset controls", "Artifact retention policy"],
    ddnFitHighlights: ["Sustained throughput under long training runs", "Checkpoint reliability at scale", "GPU utilization via consistent data feed", "High-speed fabric aligned data flow"],
    outcome: "More predictable large-scale training progress with resilient recovery paths.",
    validationFocus: ["Sustained training throughput", "Checkpoint overhead vs recovery value", "GPU utilization consistency", "Artifact governance"],
  },
  inference: {
    businessGoal: "Serve AI reliably with predictable latency and concurrency.",
    nodes: [
      flowNode("requests", "App/API requests", "Receive interactive and service-to-service inference traffic."),
      flowNode("orch", "Inference orchestration", "Route traffic to policies, models, and runtime paths."),
      flowNode("context", "Hot context/cache", "Fetch low-latency context and feature data for responses.", { ddnFit: true }),
      flowNode("serve", "Model serving", "Execute inference with autoscaling and endpoint controls.", { ddnFit: true }),
      flowNode("obs", "Observability + guardrails", "Capture telemetry, safety checks, and quality signals."),
      flowNode("app", "User-facing app", "Return responses into product and workflow experiences."),
    ],
    governance: ["Access controls", "Operational telemetry", "Policy enforcement"],
    ddnFitHighlights: ["Low-latency active data for context", "Cache/context lifecycle handling", "Model artifact delivery", "High concurrency under mixed traffic"],
    outcome: "Stable user experience with predictable latency and controlled inference behavior.",
    validationFocus: ["p95/p99 latency", "Concurrency scaling", "Context freshness", "Guardrail and policy auditability"],
  },
  simulation: {
    businessGoal: "Complete simulations faster and shorten run-to-insight.",
    nodes: [
      flowNode("input", "Simulation inputs", "Stage model inputs, parameters, and reference datasets."),
      flowNode("sched", "Scheduler", "Queue and prioritize jobs across HPC resources."),
      flowNode("data", "Parallel data platform", "Provide parallel file/data access for solver read/write paths.", { ddnFit: true }),
      flowNode("compute", "HPC compute fabric", "Run distributed simulation jobs across compute nodes.", { ddnFit: true }),
      flowNode("checkpoint", "Checkpoint/output store", "Capture restart points and simulation outputs.", { ddnFit: true }),
      flowNode("post", "Post-process + visualize", "Analyze and visualize outputs for engineering/science decisions."),
    ],
    governance: ["Project-level access controls", "Reproducible runs", "Output retention"],
    ddnFitHighlights: ["Parallel I/O for solver workloads", "Checkpoint/output durability", "High-speed interconnect aligned workflows"],
    outcome: "More simulation cycles completed with faster handoff to analysis teams.",
    validationFocus: ["Time-to-completion per job class", "Parallel I/O throughput", "Checkpoint restart success", "Post-processing handoff time"],
  },
  genomics: {
    businessGoal: "Improve sample and pipeline turnaround with traceability.",
    nodes: [
      flowNode("seq", "Sequencer outputs", "Capture raw reads and run metadata from sequencing platforms.", { ddnFit: true }),
      flowNode("ingest", "Pipeline ingest", "Stage, validate, and route genomic files through processing pipelines."),
      flowNode("platform", "Metadata-heavy platform", "Manage many small files plus lineage-rich metadata at scale.", { ddnFit: true }),
      flowNode("analysis", "Variant analytics", "Run variant calling and interpretation workflows across cohorts."),
      flowNode("assist", "AI assistance", "Support analysts with evidence-grounded interpretation assistance."),
      flowNode("report", "Reporting workflow", "Publish results into clinical/research reporting workflows."),
    ],
    governance: ["Regulated data handling", "Consent-aware access", "Reproducibility", "Long-term retention"],
    ddnFitHighlights: ["Many-small-file metadata pressure handling", "Pipeline throughput for sample batches", "Traceability across pipeline stages"],
    outcome: "Higher pipeline throughput with strong lineage for regulated reporting.",
    validationFocus: ["Sample turnaround time", "Pipeline stage throughput", "Lineage completeness", "Consent-policy adherence"],
  },
  media: {
    businessGoal: "Meet creative and rendering deadlines.",
    nodes: [
      flowNode("assets", "Media assets", "Collect source footage, scene files, and project assets.", { ddnFit: true }),
      flowNode("ingest", "Production ingest", "Ingest and normalize project assets from production pipelines."),
      flowNode("platform", "Shared asset platform", "Provide high-throughput shared access to active assets.", { ddnFit: true }),
      flowNode("queue", "Render/inference queue", "Schedule rendering and AI enhancement jobs by priority."),
      flowNode("gpu", "GPU render/inference", "Execute rendering and inference at scale under deadline pressure.", { ddnFit: true }),
      flowNode("delivery", "Delivery + review", "Deliver outputs for review, approval, and downstream distribution."),
    ],
    governance: ["Project-scoped access", "Partner access controls", "Archive and retention policy"],
    ddnFitHighlights: ["High-throughput asset movement", "Burst ingest handling", "Metadata/indexing for asset search", "Render queue performance under peaks"],
    outcome: "On-time delivery with less pipeline contention during peak renders.",
    validationFocus: ["Render queue wait time", "Asset ingest bursts", "Throughput during peak windows", "Partner access governance"],
  },
};

const genericNodes = (state: WorkloadFormState): VisualMapNode[] => [
  flowNode("data", "Data sources", "Bring together operational, historical, and contextual data used by this workload."),
  flowNode("pipeline", "Pipeline / processing", "Ingest, clean, normalize, and prepare data for analytics or model execution.", { ddnFit: true }),
  flowNode("platform", "Data platform", "Host active datasets with performance and durability aligned to workload demands.", { ddnFit: true }),
  flowNode("ai", "AI / analytics", "Execute training, analytics, or inference flows tied to the selected AI pattern.", { examples: [state.aiPattern], ddnFit: true }),
  flowNode("app", "Business workflow", "Surface outputs to analysts, operators, or APIs that drive business decisions."),
];

export function buildWorkloadVisualMap({ workloadId, selectedWorkload, state, ddnReferencePattern }: BuildVisualMapArgs): VisualMap {
  if (maps[workloadId]) {
    return { title: `${selectedWorkload?.name ?? "Workload"} Visual Map`, ...maps[workloadId] };
  }

  return {
    title: `${selectedWorkload?.name ?? (state.workloadName || "Custom Workload")} Visual Map`,
    businessGoal: state.processImproved || selectedWorkload?.description || "Clarify the business workflow and define measurable outcomes.",
    nodes: genericNodes(state),
    governance: genericGovernance(state),
    ddnFitHighlights: [
      `Closest DDN pattern: ${ddnReferencePattern.closestDdnPattern}`,
      ...ddnReferencePattern.buildingBlocks.slice(0, 3).map((block) => block.name),
    ],
    outcome: state.successCriteria || "Business workflow executes faster with stronger confidence, controls, and operational resilience.",
    validationFocus: ddnReferencePattern.validationBeforeBom.length > 0 ? ddnReferencePattern.validationBeforeBom.slice(0, 4) : ["Business KPI improvement", "Latency/throughput target attainment", "Governance evidence", "Continuity readiness"],
  };
}
