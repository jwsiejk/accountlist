import { architecturePatterns, sizingFields, workloadLibrary } from "./workload-mapper-data";
import { WorkloadFormState, WorkloadProfile } from "./workload-mapper-types";

const hasValue = (value: string) => value.trim().length > 0;

export function getSelectedWorkload(selectedWorkloadId: string) {
  return workloadLibrary.find((workload) => workload.id === selectedWorkloadId);
}

const parseList = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);
const asValue = (value: string) => value.trim() || "TBD";

function buildWhyDdnPitch(state: WorkloadFormState, workloadId: string, pattern: WorkloadFormState["aiPattern"], missingInputsCount: number): string[] {
  const ingest = asValue(state.sizingInputs.dailyIngestRate || state.dailyIngestRange);
  const objectCount = asValue(state.sizingInputs.fileObjectCount || state.filePattern);
  const concurrency = asValue(state.sizingInputs.queryConcurrency || state.queryConcurrency);
  const latency = asValue(state.latencyRequirement);
  const gpu = asValue(state.sizingInputs.gpuRequirement || state.gpuDependency);
  const governance = [state.dataSensitivity, state.accessControls, state.auditTrail, state.encryption].filter((v) => hasValue(v)).join(", ") || "governance controls";
  const haDr = asValue(state.sizingInputs.haDrRequirements);

  const workloadSpecific: Record<string, string[]> = {
    fraud: [
      "DDN matters here because fraud response is a data-speed and time-to-action problem: reducing loss exposure and false positives depends on fast ingest and retrieval across transactions, behaviors, and case evidence.",
      `For this workload, DDN sits in the data path behind near-real-time scoring and investigator context retrieval. Your captured profile (${ingest} ingest, ${objectCount}, ${concurrency}, ${latency}) signals that data movement and access consistency can become the bottleneck before models do.`,
      `Before BOM, the key question is whether the platform can keep models and investigators fed while meeting ${governance} and ${haDr}.`,
    ],
    risk: [
      "DDN matters here because risk and stress workflows are decision-window problems: the goal is to compress scenario turnaround and improve intraday risk visibility, not just run bigger batches.",
      `DDN fits as the high-throughput data foundation for large historical risk datasets, scenario execution, and reproducible outputs. With ${ingest} ingest, ${objectCount}, and ${concurrency}, storage throughput and data orchestration directly affect risk-cycle speed.`,
      `Before BOM, validate that the data platform can sustain scenario replay, lineage, and governed recovery (${haDr}) without slowing modelers down.`,
    ],
    trading: [
      "DDN matters here because quant performance is iteration speed: faster backtests and lower data wait time translate into more research cycles and better strategy decisions.",
      `DDN sits behind low-latency access to market/time-series/feature data and high-concurrency research jobs. The workload profile (${ingest}, ${objectCount}, ${concurrency}, ${latency}) points to a shared data-path bottleneck risk.`,
      `Before BOM, the conversation is whether the platform can deliver consistent low-latency reuse at scale while protecting proprietary strategy data and maintaining ${governance}.`,
    ],
    compliance: [
      "DDN matters here because compliance outcomes depend on reducing manual review while still producing evidence-backed, explainable answers under strict controls.",
      `DDN fits as the governed ingest, indexing, and retrieval foundation for policy and case content. With ${ingest}, ${objectCount}, and ${concurrency}, metadata and retrieval performance become core workflow constraints.`,
      `Before BOM, test whether the data path can keep citation/evidence retrieval fast while preserving auditability, retention, and policy enforcement (${governance}, ${haDr}).`,
    ],
    "fsi-rag": [
      "DDN matters here because trusted assistant quality is a retrieval problem: responses are only as good as governed access to fresh internal knowledge.",
      `DDN sits behind document ingest, embedding/index freshness, and low-latency retrieval for frontline users. The current signals (${ingest}, ${objectCount}, ${concurrency}, ${latency}) indicate scale where stale or slow retrieval hurts adoption.`,
      `Before BOM, confirm that RBAC/ABAC-aware retrieval and operational resilience (${haDr}) can be maintained while keeping response experience fast.`,
    ],
    "fsi-ft": [
      "DDN matters here because fine-tuning outcomes depend on data readiness and training flow, not just GPU count.",
      `DDN fits as the curated dataset and artifact/checkpoint backbone that keeps tuning pipelines fed and reproducible. The profile (${ingest}, ${objectCount}, GPU: ${gpu}) highlights pressure on throughput, checkpoint handling, and governance.`,
      `Before BOM, validate whether the platform can accelerate model iteration while preserving lineage, policy controls, and reliable recovery (${governance}, ${haDr}).`,
    ],
    "ai-training": [
      "DDN matters here because large-scale AI training success is an AI-factory data-path problem: GPU utilization depends on sustained throughput and reliable checkpointing.",
      `DDN sits behind distributed corpus prep, high-throughput reads/writes, and checkpoint durability. Captured inputs (${ingest}, ${objectCount}, GPU: ${gpu}, ${concurrency}) indicate where stalls can waste expensive training cycles.`,
      `Before BOM, prove the data platform can sustain throughput targets and recovery objectives (${haDr}) with governed controls (${governance}).`,
    ],
    inference: [
      "DDN matters here because user-facing AI quality is tied to predictable latency under concurrency spikes.",
      `DDN fits behind model serving as the hot context, cache/session, and artifact data layer. With ${concurrency}, ${latency}, ${ingest}, and GPU demand (${gpu}), the risk is tail latency from a saturated data path.`,
      `Before BOM, validate that throughput, observability, and resilience (${haDr}) can hold SLOs while keeping controls and guardrails enforceable (${governance}).`,
    ],
    simulation: [
      "DDN matters here because simulation productivity is run-to-insight speed: teams need faster checkpoint/output handling and less I/O wait across parallel jobs.",
      `DDN sits in the core HPC data path for parallel I/O, scheduler-driven workflows, and post-processing access. Inputs (${ingest}, ${objectCount}, ${concurrency}) indicate potential contention at scale.`,
      `Before BOM, verify the platform can sustain burst throughput and recovery (${haDr}) so compute cycles are spent on science, not data delays.`,
    ],
    genomics: [
      "DDN matters here because genomic throughput is constrained by metadata-heavy file operations and regulated traceability requirements.",
      `DDN fits behind sequencing ingest, pipeline staging, and reproducible downstream analysis. The workload signals (${ingest}, ${objectCount}, ${concurrency}) point to many-small-file pressure and pipeline bottlenecks.`,
      `Before BOM, ensure the data platform can shorten sample-to-insight while meeting retention, audit, and access policies (${governance}, ${haDr}).`,
    ],
    media: [
      "DDN matters here because media and rendering workflows are deadline-driven throughput problems with bursty ingest and queue pressure.",
      `DDN sits behind high-throughput asset access, shared metadata, and render/inference queue feeds. Your profile (${ingest}, ${objectCount}, ${concurrency}, GPU: ${gpu}) indicates that storage and data locality can throttle delivery timelines.`,
      `Before BOM, confirm the platform can absorb bursts, keep creative and render teams productive, and enforce archive/control policies with resilience (${haDr}).`,
    ],
  };

  if (workloadSpecific[workloadId]) return workloadSpecific[workloadId];
  return [
    `DDN matters here because ${state.processImproved || "this business workflow"} depends on consistent data speed, governed access, and reliable execution before architecture choices are finalized.`,
    `For this ${pattern} workload, DDN fits as the data foundation connecting ingest, retrieval/training/serving paths, and operational controls. Captured inputs (${ingest}, ${objectCount}, ${concurrency}, ${latency}, GPU: ${gpu}) indicate where data-path bottlenecks can block outcomes.`,
    `Before BOM, use this to test readiness: can the platform sustain performance while meeting ${governance} and ${haDr}? Missing sizing inputs (${missingInputsCount}) should be closed as part of that validation.`,
  ];
}

export function buildWorkloadProfile(
  state: WorkloadFormState,
  custom?: { name: string; category: string; description: string; defaultPattern: string; assumptions: string; pressurePoints: string },
): WorkloadProfile {
  const selectedWorkload = getSelectedWorkload(state.selectedWorkloadId);
  const pattern = state.aiPattern === "Not sure yet" ? (custom?.defaultPattern as WorkloadFormState["aiPattern"]) || selectedWorkload?.defaultPattern || "Analytics / ML pipeline" : state.aiPattern;
  const workloadName = custom?.name || state.workloadName || selectedWorkload?.name || "this workload";
  const category = custom?.category || selectedWorkload?.category || "Custom";

  const classification = `${category} | ${state.dataSensitivity} sensitivity | ${state.performanceTier} | ${pattern}`;

  const inferredPressurePoints = [
    ...(selectedWorkload?.defaultPressurePoints ?? []),
    ...(custom?.pressurePoints ? parseList(custom.pressurePoints) : []),
    ...(hasValue(state.dailyIngestRange) ? ["data ingestion velocity"] : []),
    ...(hasValue(state.freshnessRequirement) ? ["freshness and retrieval staleness"] : []),
    ...(hasValue(state.queryConcurrency) ? ["query/request concurrency"] : []),
    ...(state.gpuDependency.toLowerCase().includes("high") ? ["GPU dependency and scheduling"] : []),
    ...(state.auditTrail.toLowerCase().includes("strict") ? ["auditability and lineage"] : []),
  ];
  const pressurePoints = [...new Set(inferredPressurePoints)].slice(0, 8);
  const architectureSteps = architecturePatterns[pattern] ?? architecturePatterns["Analytics / ML pipeline"];

  const byPattern: Record<string, Record<string, string[]>> = {
    RAG: {
      Compute: ["Balanced CPU/GPU pools for embedding and retrieval services", "Model-serving tier with autoscaling"],
      "Storage / Data Platform": ["High-throughput document ingest", "Vector database / retrieval layer", "Tiered object+file data platform"],
      Network: ["Low-latency east-west path between retrieval and serving", "Segmentation for governance zones"],
      "AI Software": ["Chunking + embedding pipeline services", "RAG orchestration and evaluation toolkit"],
      "Security / Governance": ["Governance-aware access controls", "Encryption + audit trail for content provenance"],
      Services: ["Data onboarding workshops", "Retrieval relevance tuning + runbook enablement"],
    },
    "Fine-tuning": {
      Compute: ["GPU training cluster", "Dedicated evaluation compute tier"],
      "Storage / Data Platform": ["High-throughput training storage", "Checkpoint and artifact storage"],
      Network: ["High-bandwidth east-west fabric for distributed training"],
      "AI Software": ["Distributed training framework", "Experiment tracking + model registry"],
      "Security / Governance": ["Controlled training-data staging", "Audit + explainability reporting hooks"],
      Services: ["Benchmark and tuning services", "MLOps hardening and handoff"],
    },
    "Training from scratch": {
      Compute: ["Large GPU training cluster", "Elastic preprocessing fleet"],
      "Storage / Data Platform": ["High-throughput training storage", "Checkpoint/artifact storage + lifecycle policy"],
      Network: ["High-speed interconnect optimized for distributed training"],
      "AI Software": ["Distributed training framework", "Evaluation harness and registry"],
      "Security / Governance": ["Dataset lineage controls", "Encryption and policy controls"],
      Services: ["Scaling characterization plan", "Performance tuning and operational readiness"],
    },
    "Inference only": {
      Compute: ["Model serving tier", "Autoscaling request workers"],
      "Storage / Data Platform": ["Cache/session layer", "Model artifact repository"],
      Network: ["API edge + low-latency service mesh", "Traffic shaping and isolation policies"],
      "AI Software": ["Request orchestration", "Prompt/feature processing pipeline", "Latency and concurrency observability"],
      "Security / Governance": ["Guardrails + policy enforcement", "Access and token governance"],
      Services: ["SLO validation drills", "Capacity planning with peak-profile replay"],
    },
    "Analytics / ML pipeline": {
      Compute: ["Scalable analytics compute clusters", "Batch + interactive execution pools"],
      "Storage / Data Platform": ["Unified data platform", "Feature engineering and dataset services"],
      Network: ["Reliable data movement fabric", "Observability for pipeline bottlenecks"],
      "AI Software": ["ETL/ELT orchestration", "ML pipeline and model lifecycle tooling"],
      "Security / Governance": ["Data quality + lineage controls", "Policy-based access and retention"],
      Services: ["Pipeline rationalization workshops", "Operational scorecard and runbook"],
    },
    "HPC simulation": {
      Compute: ["HPC compute fabric", "Scheduler-integrated execution pools"],
      "Storage / Data Platform": ["Parallel file/data platform", "Simulation output repository"],
      Network: ["High-speed interconnect", "Flow telemetry for MPI / east-west patterns"],
      "AI Software": ["Job scheduler", "Post-processing / visualization workflow"],
      "Security / Governance": ["Project-level access controls", "Result integrity and retention policy"],
      Services: ["Queue-policy optimization", "Post-processing pipeline acceleration"],
    },
  };

  const buildingBlocks = byPattern[pattern] ?? byPattern["Analytics / ML pipeline"];

  const knownInputs = sizingFields.filter((field) => hasValue(state.sizingInputs[field.key])).map((field) => ({ label: field.label, value: state.sizingInputs[field.key] }));
  const missingInputs = sizingFields.filter((field) => !hasValue(state.sizingInputs[field.key])).map((field) => ({ label: field.label, whyItMatters: field.whyItMatters }));
  const readinessPercent = Math.round((knownInputs.length / sizingFields.length) * 100);
  const whyDdn = buildWhyDdnPitch(state, state.selectedWorkloadId, pattern, missingInputs.length);

  return { classification, pressurePoints, architectureSteps, buildingBlocks, readinessPercent, knownInputs, missingInputs, whyDdn };
}
