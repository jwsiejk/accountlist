import type { AiPattern, WorkloadFormState } from "./workload-mapper-types";

export interface PipelineStepHelp {
  title: string;
  plainEnglish: string;
  whyItMatters: string;
  example?: string;
  questions: string[];
  ddnAngle?: string;
}

interface PipelineStepHelpArgs {
  step: string;
  workloadId?: string;
  workloadName?: string;
  category?: string;
  aiPattern: AiPattern;
  state: WorkloadFormState;
}

const normalizeStep = (step: string): string => {
  const lower = step.toLowerCase();
  if (lower.includes("data source")) return "Data Sources";
  if (lower.includes("ingestion")) return "Ingestion / Normalization";
  if (lower.includes("chunk")) return "Chunking + Embedding";
  if (lower.includes("unified data platform") || lower.includes("high-performance data platform")) return "High-Performance Data Platform";
  if (lower.includes("vector") || lower.includes("retrieval")) return "Vector DB / Retrieval";
  if (lower.includes("llm") || lower.includes("model serving") || lower.includes("ml/analytics")) return "LLM / Model Serving";
  if (lower.includes("business app") || lower.includes("decision app") || lower.includes("application")) return "Business App";
  return step;
};

const describeScale = (state: WorkloadFormState): string => {
  const ingest = state.dailyIngestRange || state.sizingInputs.dailyIngestRate;
  const concurrency = state.queryConcurrency || state.sizingInputs.queryConcurrency;
  if (ingest && concurrency) {
    return `Because this workload includes ${ingest} ingest and ${concurrency} concurrent analyst/system sessions, this layer needs to support both write pressure and fast retrieval.`;
  }
  if (ingest) return `Because this workload includes ${ingest} ingest, this layer should absorb sustained write pressure without slowing downstream users.`;
  if (concurrency) return `Because this workload expects ${concurrency} concurrent analyst/system sessions, retrieval and scoring paths must stay responsive under load.`;
  return "This layer has to balance ingest throughput and read responsiveness as workload demand grows.";
};

const fraudHelpByStep = (step: string, state: WorkloadFormState): PipelineStepHelp | null => {
  switch (step) {
    case "Data Sources":
      return {
        title: step,
        plainEnglish:
          "This is where the raw fraud evidence starts: transaction events, account activity, identity/device signals, historical fraud cases, investigation notes, and policy/rules data.",
        whyItMatters:
          "Fraud detection is only as good as the signals it can see. If transaction, identity, behavior, and case data are fragmented, the model or investigator may miss the full pattern.",
        questions: [
          "Which fraud data sources are in scope first?",
          "How fresh does each source need to be for prevention vs post-event investigation?",
          "Which teams/systems own transaction, identity, behavior, and case data?",
        ],
        ddnAngle: "DDN angle: This is where data movement, metadata quality, and freshness alignment become architecture constraints.",
      };
    case "Ingestion / Normalization":
      return {
        title: step,
        plainEnglish:
          "This step moves data from source systems into a common structure so scoring, analytics, and investigation tools can use it.",
        whyItMatters:
          "For fraud, this matters because new events need to become usable quickly enough to act before loss exposure grows.",
        questions: [
          "What is the target ingest-to-usable-data SLA for high-risk events?",
          "What schema and entity standardization is required across channels?",
          "Where do late-arriving events and corrections get handled?",
        ],
        ddnAngle: "DDN angle: Ingest burst handling, transformation throughput, and metadata consistency should be validated early.",
      };
    case "Chunking + Embedding":
      return {
        title: step,
        plainEnglish:
          "For fraud, this mostly applies to unstructured case notes, policies, investigation documents, and evidence artifacts. The system breaks that content into searchable pieces and creates embeddings so investigator context can be retrieved later.",
        whyItMatters:
          "Without high-quality chunking and embeddings, retrieval can miss key evidence context and reduce investigator trust.",
        questions: [
          "Which document types should be embedded first?",
          "What redaction or masking is required before indexing sensitive artifacts?",
          "How will relevance quality be measured for investigators?",
        ],
      };
    case "High-Performance Data Platform":
      return {
        title: step,
        plainEnglish:
          "This is the active data foundation supporting fast ingest, fast reads, and many concurrent analyst/system requests.",
        whyItMatters: describeScale(state),
        questions: [
          "What peak burst periods (for example, fraud campaigns or seasonal spikes) must be absorbed?",
          "Which queries must remain interactive during peak write load?",
          "What retention and tiering policy keeps investigations fast without runaway cost?",
        ],
      };
    case "Vector DB / Retrieval":
      return {
        title: step,
        plainEnglish:
          "This is how the system finds the most relevant case notes, policy context, prior fraud patterns, or supporting evidence for the investigator or LLM.",
        whyItMatters: "Retrieval quality and freshness directly impact triage speed and decision confidence.",
        questions: [
          "What evidence should always be in top results for priority alert types?",
          "How quickly should new case notes become retrievable?",
          "What access filters are required so analysts only see permitted case context?",
        ],
      };
    case "LLM / Model Serving":
      return {
        title: step,
        plainEnglish:
          "This is where the fraud assistant, scoring model, anomaly model, or summarization model runs. It may use GPU-backed inference depending on latency, model size, and concurrency requirements.",
        whyItMatters:
          "Serving architecture determines whether fraud decisions and investigator copilots can respond within operational SLAs.",
        questions: [
          "Which model paths are blocking (must answer in-line) vs asynchronous?",
          "What p95/p99 latency targets are required for alerts and analyst workflows?",
          "How will model drift and false-positive rates be monitored in production?",
        ],
      };
    case "Business App":
      return {
        title: step,
        plainEnglish:
          "This is what the fraud analyst or risk operations team actually uses: a case-management screen, investigation assistant, alerting workflow, dashboard, or API integrated into the fraud platform.",
        whyItMatters:
          "Business outcomes depend on whether insights are delivered inside analyst workflows with clear actions and evidence.",
        questions: [
          "Which decisions are made in this interface and who approves them?",
          "What evidence must be visible before an analyst can close or escalate a case?",
          "Which actions should be automated vs analyst-confirmed?",
        ],
      };
    default:
      return null;
  }
};

const tradingHelpByStep = (step: string, state: WorkloadFormState): PipelineStepHelp | null => {
  switch (step) {
    case "High-Performance Data Platform":
      return {
        title: step,
        plainEnglish: "This is the market/time-series active data platform where quant teams access hot market data, derived features, and replay windows.",
        whyItMatters: describeScale(state),
        questions: [
          "Which datasets must stay in the lowest-latency tier for intraday research?",
          "What data retention split is needed between hot replay windows and colder history?",
          "Which ingest bursts (market-open/close or event spikes) must be absorbed without query degradation?",
        ],
      };
    case "LLM / Model Serving":
      return {
        title: step,
        plainEnglish: "For trading research, this layer usually supports analytics/backtesting execution and optional AI-assisted signal interpretation.",
        whyItMatters: "Backtest turnaround and model response time directly control research velocity.",
        questions: [
          "What p95 latency target is acceptable for interactive research workflows?",
          "How many concurrent backtests or model-evaluation jobs must run during peak ideation windows?",
          "Which validation checks gate strategy promotion from research to controlled rollout?",
        ],
      };
    case "Business App":
      return {
        title: step,
        plainEnglish: "This is the quant research workspace: notebooks, dashboards, and review flows where strategies are evaluated and approved.",
        whyItMatters: "Research value only materializes when strategy evidence and governance are visible to the right reviewers.",
        questions: [
          "Which teams can view proprietary strategy outputs and under what controls?",
          "What evidence must be captured before a strategy moves to next-stage validation?",
          "Which actions should be automated versus explicitly approved by risk/governance teams?",
        ],
      };
    default:
      return null;
  }
};

const fineTuningHelpByStep = (step: string): PipelineStepHelp | null => {
  switch (step) {
    case "Ingestion / Normalization":
      return {
        title: step,
        plainEnglish: "This is where curated training corpora, labels, and policy transforms are prepared into a usable fine-tuning dataset.",
        whyItMatters: "Data quality and policy checks at this stage determine downstream model quality and governance readiness.",
        questions: [
          "Which labeling and quality gates are required before data can enter tuning runs?",
          "What redaction or residency rules apply to sensitive financial content?",
          "How frequently should new training examples be promoted into curated datasets?",
        ],
      };
    case "High-Performance Data Platform":
      return {
        title: step,
        plainEnglish: "This is the high-throughput training data path that keeps fine-tuning jobs supplied with curated data and checkpoints.",
        whyItMatters: "Iteration speed drops quickly if data delivery or checkpoint movement becomes inconsistent.",
        questions: [
          "What sustained throughput is required during peak tuning windows?",
          "What checkpoint cadence is needed for rollback and experiment continuity?",
          "Which retention windows apply to artifacts, run logs, and promoted models?",
        ],
      };
    case "LLM / Model Serving":
      return {
        title: step,
        plainEnglish: "This layer runs GPU fine-tuning execution, evaluation passes, and candidate model validation.",
        whyItMatters: "The architecture must support repeatable tuning cycles with lineage and benchmark visibility.",
        questions: [
          "What turnaround target is required for each tuning-evaluation cycle?",
          "Which benchmark gates must pass before a model can be registered as production-candidate?",
          "What lineage evidence is required for model-risk and audit review?",
        ],
      };
    default:
      return null;
  }
};

const riskHelpByStep = (step: string): PipelineStepHelp | null => {
  switch (step) {
    case "Data Sources":
      return {
        title: step,
        plainEnglish: "This is where governed historical portfolio, position, pricing, and market data enters the risk workflow.",
        whyItMatters: "Scenario credibility depends on complete, reproducible historical inputs.",
        questions: [
          "What historical depth is mandatory for stress scenarios and regulatory reporting?",
          "Which sources refresh intraday versus end-of-day?",
          "Which ownership boundaries apply across risk, treasury, and market-data teams?",
        ],
      };
    case "High-Performance Data Platform":
      return {
        title: step,
        plainEnglish: "This is the shared risk data platform used for scenario pipelines, parallel analytics runs, and result retrieval.",
        whyItMatters: "Batch and intraday windows are constrained by how quickly many runs can read and write shared data.",
        questions: [
          "What peak concurrent scenario runs must complete inside required windows?",
          "Which result sets must remain instantly queryable for downstream reporting?",
          "How should historical risk data be tiered without breaking reproducibility?",
        ],
      };
    case "Business App":
      return {
        title: step,
        plainEnglish: "This is where risk analysts and governance teams review scenario outcomes, exceptions, and validation evidence.",
        whyItMatters: "Decisions depend on trusted aggregation, clear lineage, and reproducible replay paths.",
        questions: [
          "What output aggregations are required for committee/regulatory review?",
          "What lineage depth is required to reproduce a prior stress result?",
          "Which alerts should trigger when batch or intraday windows are at risk?",
        ],
      };
    default:
      return null;
  }
};

export function getPipelineStepHelp(args: PipelineStepHelpArgs): PipelineStepHelp {
  const normalizedStep = normalizeStep(args.step);
  if (args.workloadId === "fraud" || args.workloadName?.toLowerCase().includes("fraud")) {
    const fraudHelp = fraudHelpByStep(normalizedStep, args.state);
    if (fraudHelp) return fraudHelp;
  }
  if (args.workloadId === "trading") {
    const tradingHelp = tradingHelpByStep(normalizedStep, args.state);
    if (tradingHelp) return tradingHelp;
  }
  if (args.workloadId === "fsi-ft") {
    const ftHelp = fineTuningHelpByStep(normalizedStep);
    if (ftHelp) return ftHelp;
  }
  if (args.workloadId === "risk") {
    const riskHelp = riskHelpByStep(normalizedStep);
    if (riskHelp) return riskHelp;
  }

  return {
    title: normalizedStep,
    plainEnglish: `${normalizedStep} is a core stage in the ${args.aiPattern} architecture flow for ${args.workloadName || "this workload"}.`,
    whyItMatters:
      "This step is where data quality, throughput, or response behavior can either preserve or degrade downstream AI outcomes.",
    example: args.state.processImproved
      ? `Example: for "${args.state.processImproved}", this stage should be designed to keep the decision path reliable under expected demand.`
      : undefined,
    questions: [
      `What does success look like for ${normalizedStep.toLowerCase()} in this workload?`,
      "Which current captured inputs change sizing or design decisions here?",
      "What evidence would prove this step is ready for pilot-to-production scale?",
    ],
    ddnAngle: "DDN angle: This is where data movement, metadata, throughput, or retrieval freshness can become part of the architecture conversation.",
  };
}
