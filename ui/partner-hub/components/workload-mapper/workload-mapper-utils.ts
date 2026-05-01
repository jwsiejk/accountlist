import { architecturePatterns, sizingFields, workloadLibrary } from "./workload-mapper-data";
import { WorkloadFormState, WorkloadProfile } from "./workload-mapper-types";

const hasValue = (value: string) => value.trim().length > 0;

export function getSelectedWorkload(selectedWorkloadId: string) {
  return workloadLibrary.find((workload) => workload.id === selectedWorkloadId);
}

const parseList = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);

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
  const nextBestQuestions = missingInputs.slice(0, 4).map((input) => `Can we quantify ${input.label.toLowerCase()}? This matters because ${input.whyItMatters.toLowerCase()}`);

  const talkTrack = [
    `Executive framing: I start with ${workloadName} because it reveals the data pattern, constraints, and likely infrastructure pressure points before we discuss BOM scope.`,
    `SE discovery flow: For this ${pattern} pattern, I validate data types (${state.dataTypes.join(", ") || "TBD"}), freshness (${state.freshnessRequirement || "TBD"}), latency (${state.latencyRequirement || "TBD"}), concurrency (${state.queryConcurrency || "TBD"}), and governance controls (${state.accessControls || "TBD"}).`,
    `Next-step questions before BOM: We still need ${missingInputs.length} key inputs. ${nextBestQuestions.join(" ")} This is BOM readiness, not a BOM.`,
  ];

  return { classification, pressurePoints, architectureSteps, buildingBlocks, readinessPercent, knownInputs, missingInputs, talkTrack };
}
