import { SizingField, WorkloadTemplate } from "./workload-mapper-types";

export const workloadLibrary: WorkloadTemplate[] = [
  { id: "fraud", name: "Fraud Detection & Investigation", category: "FSI", description: "Detect anomalies quickly, investigate patterns, and improve fraud response confidence.", defaultPattern: "RAG", defaultPressurePoints: ["data ingestion velocity", "retrieval freshness", "governance and auditability"], assumptions: ["Near real-time event feeds", "Mixed structured and unstructured investigation artifacts"] },
  { id: "risk", name: "Risk Modeling / Stress Testing", category: "FSI", description: "Run frequent portfolio stress analysis under evolving market conditions.", defaultPattern: "Analytics / ML pipeline", defaultPressurePoints: ["parallel data access", "scenario orchestration", "retention and lineage"], assumptions: ["Large historical data windows", "Compute spikes during quarterly stress cycles"] },
  { id: "trading", name: "Trading / Quant Research", category: "FSI", description: "Accelerate alpha research and intraday strategy iteration.", defaultPattern: "Analytics / ML pipeline", defaultPressurePoints: ["low latency data access", "high query concurrency", "checkpointing"], assumptions: ["Time-series heavy", "High-frequency model refresh"] },
  { id: "compliance", name: "Compliance / Document Intelligence", category: "FSI", description: "Extract obligations and evidence from policy and regulatory content.", defaultPattern: "RAG", defaultPressurePoints: ["embedding pipeline throughput", "explainability", "access controls"], assumptions: ["High-sensitivity documents", "Audit traceability is mandatory"] },
  { id: "fsi-rag", name: "RAG Knowledge Assistant", category: "FSI", description: "Enable secure knowledge retrieval for relationship managers and operations teams.", defaultPattern: "RAG", defaultPressurePoints: ["retrieval freshness", "vector search consistency", "data residency"], assumptions: ["Many small documents", "Strict role-based access"] },
  { id: "fsi-ft", name: "Model Training / Fine-tuning", category: "FSI", description: "Adapt domain models for financial language, risk, and client workflows.", defaultPattern: "Fine-tuning", defaultPressurePoints: ["GPU utilization", "checkpointing", "secure data staging"], assumptions: ["Controlled training datasets", "Periodic retraining cycles"] },
  { id: "ai-training", name: "Large-scale AI Training", category: "HPC / AI", description: "Train foundation or domain models with distributed training at scale.", defaultPattern: "Training from scratch", defaultPressurePoints: ["GPU utilization", "checkpointing", "parallel data access"], assumptions: ["Large batch windows", "Sustained high throughput storage"] },
  { id: "inference", name: "Inference Platform", category: "HPC / AI", description: "Serve interactive and API inference workloads with predictable latency.", defaultPattern: "Inference only", defaultPressurePoints: ["request concurrency", "model cache locality", "latency SLO adherence"], assumptions: ["Multi-tenant demand variability", "Autoscaling serving tiers"] },
  { id: "simulation", name: "Scientific Simulation", category: "HPC / AI", description: "Execute numerically intense simulation runs and iterative experiments.", defaultPattern: "HPC simulation", defaultPressurePoints: ["parallel file access", "interconnect bandwidth", "job scheduling efficiency"], assumptions: ["Large temporary datasets", "Burst-like compute scheduling"] },
  { id: "genomics", name: "Genomics / Life Sciences", category: "HPC / AI", description: "Process sequencing pipelines and AI-assisted analysis under compliance controls.", defaultPattern: "Analytics / ML pipeline", defaultPressurePoints: ["file/object explosion", "pipeline throughput", "data governance"], assumptions: ["Many small files", "Long retention for reproducibility"] },
  { id: "media", name: "Media / Rendering Pipeline", category: "HPC / AI", description: "Run rendering and media enhancement pipelines with tight delivery timelines.", defaultPattern: "Inference only", defaultPressurePoints: ["throughput orchestration", "storage bandwidth", "deadline-driven scaling"], assumptions: ["Mixed file sizes", "High sustained ingest during production windows"] },
];

export const sizingFields: SizingField[] = [
  { key: "exactDataVolume", label: "Exact data volume", whyItMatters: "Determines storage capacity, tiering strategy, and expected recovery windows." },
  { key: "dailyIngestRate", label: "Daily ingest rate", whyItMatters: "Shapes ingestion architecture and write throughput requirements." },
  { key: "fileObjectCount", label: "File/object count", whyItMatters: "Impacts metadata scaling, namespace performance, and indexing approach." },
  { key: "queryConcurrency", label: "Query concurrency", whyItMatters: "Guides compute sizing and caching strategy for peak user demand." },
  { key: "modelSize", label: "Model size", whyItMatters: "Influences memory footprint, model distribution, and serving pattern decisions." },
  { key: "gpuRequirement", label: "GPU requirement", whyItMatters: "Defines accelerator class, scheduling policy, and power/cooling footprint." },
  { key: "retentionPeriod", label: "Retention period", whyItMatters: "Establishes lifecycle policy, archival strategy, and compliance posture." },
  { key: "haDrRequirements", label: "HA/DR requirements", whyItMatters: "Sets availability targets and cross-site architecture expectations." },
  { key: "preferredVendors", label: "Preferred vendors", whyItMatters: "Highlights integration constraints and procurement dependencies early." },
  { key: "budgetTimeline", label: "Budget/timeline", whyItMatters: "Aligns solution shape with delivery phases and implementation risk." },
];

export const architecturePatterns: Record<string, string[]> = {
  RAG: ["Data Sources", "Ingestion / Normalization", "Feature + Embedding Pipeline", "High-Performance Data Platform", "Vector DB / Analytics Engine", "LLM / Model Serving", "Business Application"],
  "Training from scratch": ["Data Lake + Curation", "Distributed Preprocessing", "High-Throughput Training Storage", "GPU Training Cluster", "Checkpoint & Artifact Registry", "Model Validation", "Model Registry"],
  "Fine-tuning": ["Domain Dataset", "Data Quality + Labeling", "Fine-tuning Pipeline", "Accelerated Training", "Evaluation Harness", "Model Registry", "Deployment Targets"],
  "Inference only": ["Application/API Gateway", "Request Orchestration", "Feature/Prompt Processing", "Model Serving Tier", "Caching + Session State", "Observability + Guardrails"],
  "Analytics / ML pipeline": ["Data Sources", "Ingestion", "ETL/ELT + Feature Engineering", "Unified Data Platform", "ML/Analytics Execution", "BI / Decision Apps"],
  "HPC simulation": ["Scientific Inputs", "Job Scheduler", "Parallel File/Data Platform", "HPC Compute Fabric", "Simulation Output Store", "Post-processing + Visualization"],
};
