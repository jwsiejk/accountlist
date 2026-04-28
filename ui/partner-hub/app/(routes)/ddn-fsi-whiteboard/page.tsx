"use client";

import { useMemo, useState } from "react";
import styles from "./whiteboard.module.css";

type WorkloadKey = "quantResearch" | "riskModeling" | "fraudDetection" | "aiGenAI";
type StageKey = "dataSources" | "ingest" | "dataAccessLayer" | "compute" | "workloads" | "businessOutcomes";
type SymptomKey = "backtests" | "riskRuns" | "gpuUnderutilized" | "fraudDelayed" | "aiPilotsStuck";

type WorkloadContent = {
  label: string;
  stages: Record<StageKey, string[]>;
  discoveryQuestion: string;
  ddnFit: string;
};

type SymptomContent = {
  label: string;
  workload: WorkloadKey;
  constraint: string;
  businessOutcome: string;
  nextQuestion: string;
  ddnHypothesis: string;
};

const STAGE_ORDER: Array<{ key: StageKey; label: string; step: number }> = [
  { key: "dataSources", label: "Data Sources", step: 1 },
  { key: "ingest", label: "Ingest", step: 2 },
  { key: "dataAccessLayer", label: "Constraint", step: 3 },
  { key: "compute", label: "Compute", step: 4 },
  { key: "workloads", label: "Workloads", step: 5 },
  { key: "businessOutcomes", label: "Outcomes", step: 6 },
];

const WORKLOADS: Record<WorkloadKey, WorkloadContent> = {
  quantResearch: {
    label: "Quant Research",
    stages: {
      dataSources: ["Tick data", "Historical market data", "Alternative data", "Research datasets"],
      ingest: ["Batch ingest", "Market feeds", "Data normalization"],
      dataAccessLayer: ["High concurrency", "Parallel reads", "Shared datasets", "Backtesting bottlenecks"],
      compute: ["CPU grids", "GPU clusters", "Research environments"],
      workloads: ["Backtesting", "Simulation", "Strategy research"],
      businessOutcomes: ["Faster strategy iteration", "Shorter time-to-alpha", "Higher compute utilization"],
    },
    discoveryQuestion: "How long do backtesting cycles take today, and where do jobs queue?",
    ddnFit: "Parallel data access at scale helps keep research compute fed instead of waiting on data.",
  },
  riskModeling: {
    label: "Risk Modeling",
    stages: {
      dataSources: ["Portfolio data", "Market scenarios", "Reference data", "Historical positions"],
      ingest: ["Batch loads", "Scenario feeds", "Data preparation"],
      dataAccessLayer: ["Large batch reads", "Simulation throughput", "Concurrent model runs", "Data growth pressure"],
      compute: ["HPC grids", "Analytics engines", "Risk platforms"],
      workloads: ["Stress testing", "Scenario modeling", "Monte Carlo"],
      businessOutcomes: ["Move toward intraday risk", "Faster decision windows", "Regulatory responsiveness"],
    },
    discoveryQuestion: "Are risk runs still overnight, or is the goal intraday visibility?",
    ddnFit: "High-throughput data access supports large-scale simulation workflows and reduces data wait time.",
  },
  fraudDetection: {
    label: "Fraud Detection",
    stages: {
      dataSources: ["Transactions", "Customer behavior", "Device signals", "Historical fraud patterns"],
      ingest: ["Streaming events", "Real-time enrichment", "Historical joins"],
      dataAccessLayer: ["Real-time + historical access", "Feature retrieval", "Model refresh", "Latency pressure"],
      compute: ["ML scoring", "Streaming analytics", "Detection engines"],
      workloads: ["Fraud scoring", "Pattern detection", "Model retraining"],
      businessOutcomes: ["Faster fraud response", "Reduced loss exposure", "Better model accuracy"],
    },
    discoveryQuestion: "What is the business cost when detection is delayed?",
    ddnFit:
      "A scalable AI data foundation helps teams access current and historical data quickly for detection and model improvement.",
  },
  aiGenAI: {
    label: "AI / GenAI",
    stages: {
      dataSources: ["Documents", "Market data", "Research content", "Customer data", "Training datasets"],
      ingest: ["Data prep", "Embedding pipelines", "Dataset curation"],
      dataAccessLayer: ["GPU feeding", "Checkpointing", "Dataset reuse", "RAG retrieval pressure"],
      compute: ["GPU clusters", "Inference services", "Vector / RAG stack"],
      workloads: ["Model training", "Fine-tuning", "RAG", "AI assistants"],
      businessOutcomes: ["Higher GPU ROI", "Faster time-to-model", "AI pilots into production"],
    },
    discoveryQuestion: "What GPU utilization are you seeing, and where does the pipeline slow down?",
    ddnFit:
      "High-performance data access helps feed GPUs, support training/checkpointing, and reduce AI pipeline friction.",
  },
};

const SYMPTOMS: Record<SymptomKey, SymptomContent> = {
  backtests: {
    label: "Backtests take too long",
    workload: "quantResearch",
    constraint: "High-concurrency reads against shared historical and alternative datasets.",
    businessOutcome: "Shorter research cycles, faster strategy iteration, and improved time-to-alpha.",
    nextQuestion: "Where do jobs queue today — compute, scheduler, network, or data access?",
    ddnHypothesis: "Validate whether parallel data access is limiting research throughput.",
  },
  riskRuns: {
    label: "Risk runs are still overnight",
    workload: "riskModeling",
    constraint: "Simulation throughput and batch-window pressure as model complexity and data volumes grow.",
    businessOutcome: "Move toward intraday risk visibility and faster decision windows.",
    nextQuestion: "Which step owns the batch window — data prep, model execution, or result aggregation?",
    ddnHypothesis: "Validate whether throughput and data wait time are extending the risk cycle.",
  },
  gpuUnderutilized: {
    label: "GPUs are underutilized",
    workload: "aiGenAI",
    constraint: "Data feeding, checkpointing, or dataset reuse is limiting expensive compute.",
    businessOutcome: "Higher GPU ROI, faster time-to-model, and better use of AI infrastructure spend.",
    nextQuestion: "What does GPU utilization look like during training, and when does it drop?",
    ddnHypothesis: "Validate whether the data pipeline is starving GPUs or slowing checkpoint/restart cycles.",
  },
  fraudDelayed: {
    label: "Fraud response is delayed",
    workload: "fraudDetection",
    constraint: "Real-time scoring needs fast access to both streaming events and historical feature context.",
    businessOutcome: "Reduced loss exposure, faster fraud response, and improved detection accuracy.",
    nextQuestion: "What is the cost of delayed detection, and where does latency enter the flow?",
    ddnHypothesis: "Validate whether real-time and historical data access are slowing detection workflows.",
  },
  aiPilotsStuck: {
    label: "AI pilots are stuck",
    workload: "aiGenAI",
    constraint: "Data preparation, retrieval, checkpointing, and dataset reuse are not production-ready.",
    businessOutcome: "Move AI initiatives from pilot to production faster with better infrastructure leverage.",
    nextQuestion: "Where are pilots slowing down — data prep, training, retrieval, governance, or inference?",
    ddnHypothesis: "Validate whether the AI data pipeline can support repeatable production workloads.",
  },
};

const SYMPTOM_ORDER: SymptomKey[] = ["backtests", "riskRuns", "gpuUnderutilized", "fraudDelayed", "aiPilotsStuck"];

const CALL_OUTS = ["Where does it slow down?", "Is compute waiting on data?", "What outcome matters?"];

const DIAGNOSIS_COLUMNS: Array<{ title: string; getCopy: (symptom: SymptomContent) => string }> = [
  { title: "Customer symptom", getCopy: (symptom) => symptom.label },
  { title: "Likely constraint", getCopy: (symptom) => symptom.constraint },
  { title: "Business outcome", getCopy: (symptom) => symptom.businessOutcome },
  { title: "Best next question", getCopy: (symptom) => symptom.nextQuestion },
  { title: "DDN hypothesis", getCopy: (symptom) => symptom.ddnHypothesis },
];

export default function DdnFsiWhiteboardPage() {
  const [selectedWorkload, setSelectedWorkload] = useState<WorkloadKey>("quantResearch");
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomKey>("backtests");

  const workload = useMemo(() => WORKLOADS[selectedWorkload], [selectedWorkload]);
  const symptom = useMemo(() => SYMPTOMS[selectedSymptom], [selectedSymptom]);

  const setWorkloadWithSymptomAlignment = (nextWorkload: WorkloadKey) => {
    const currentSymptom = SYMPTOMS[selectedSymptom];
    const keepCurrent = currentSymptom.workload === nextWorkload;

    if (!keepCurrent) {
      const firstMatching = SYMPTOM_ORDER.find((symptomKey) => SYMPTOMS[symptomKey].workload === nextWorkload);
      if (firstMatching) {
        setSelectedSymptom(firstMatching);
      }
    }

    setSelectedWorkload(nextWorkload);
  };

  const setSymptomAndWorkload = (symptomKey: SymptomKey) => {
    const nextSymptom = SYMPTOMS[symptomKey];
    setSelectedSymptom(symptomKey);
    setSelectedWorkload(nextSymptom.workload);
  };

  return (
    <main className={styles.page}>
      <section className={styles.headerSection}>
        <p className={styles.kicker}>DDN FSI conversation whiteboard</p>
        <h1 className={styles.title}>DDN FSI Deal Qualifier</h1>
        <p className={styles.subtitle}>
          A whiteboard-style way to turn customer symptoms into workload constraints, business outcomes, discovery
          questions, and measurable next steps.
        </p>
        <p className={styles.loomHint}>Start with the symptom. Diagnose the constraint. Quantify the outcome.</p>
      </section>

      <section className={styles.diagnosisSection} aria-label="Symptom-driven qualification">
        <div className={styles.diagnosisHeader}>
          <h2 className={styles.panelTitle}>Start with what the customer says</h2>
          <p className={styles.diagnosisSubtitle}>
            Translate the symptom into a constraint, business outcome, discovery question, and DDN hypothesis.
          </p>
        </div>

        <div className={styles.symptomGrid}>
          {SYMPTOM_ORDER.map((symptomKey) => {
            const item = SYMPTOMS[symptomKey];
            const isSelected = selectedSymptom === symptomKey;

            return (
              <button
                key={symptomKey}
                type="button"
                className={`${styles.symptomCard} ${isSelected ? styles.symptomCardSelected : ""}`}
                onClick={() => setSymptomAndWorkload(symptomKey)}
                aria-pressed={isSelected}
              >
                <span className={styles.symptomLabel}>“{item.label}”</span>
                <span className={styles.symptomWorkload}>{WORKLOADS[item.workload].label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.diagnosisPanel}>
          {DIAGNOSIS_COLUMNS.map((column) => (
            <article key={column.title} className={styles.diagnosisCard}>
              <h3>{column.title}</h3>
              <p>{column.getCopy(symptom)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.tabSection} aria-label="Workload selector">
        <div className={styles.tabs} role="tablist" aria-label="FSI workload tabs">
          {(Object.keys(WORKLOADS) as WorkloadKey[]).map((workloadKey) => {
            const isSelected = workloadKey === selectedWorkload;

            return (
              <button
                key={workloadKey}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`${styles.tabButton} ${isSelected ? styles.tabButtonActive : ""}`}
                onClick={() => setWorkloadWithSymptomAlignment(workloadKey)}
              >
                {WORKLOADS[workloadKey].label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={styles.resetButton}
          onClick={() => {
            setSelectedSymptom("backtests");
            setSelectedWorkload("quantResearch");
          }}
          disabled={selectedWorkload === "quantResearch" && selectedSymptom === "backtests"}
        >
          Reset to Quant Research
        </button>
      </section>

      <section className={styles.pipelineSection}>
        {STAGE_ORDER.map((stage, index) => {
          const isDataAccess = stage.key === "dataAccessLayer";
          const isBusinessOutcome = stage.key === "businessOutcomes";

          return (
            <div key={stage.key} className={styles.stageWithArrow}>
              <article
                className={`${styles.stageCard} ${isDataAccess ? styles.dataAccessCard : ""} ${isBusinessOutcome ? styles.outcomeCard : ""}`}
              >
                <div className={styles.stageHeader}>
                  <span className={styles.stageBadge} aria-hidden="true">
                    {stage.step}
                  </span>
                  <h2 className={styles.stageTitle}>{stage.label}</h2>
                </div>
                <ul className={styles.stageList}>
                  {workload.stages[stage.key].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {isDataAccess ? (
                  <>
                    <p className={styles.dataAccessCallout}>Validate this before pitching architecture.</p>
                    <div className={styles.ddnFitPanel}>
                      <p className={styles.ddnFitLabel}>DDN hypothesis: data access may be limiting the workload</p>
                      <p className={styles.ddnFitCopy}>{workload.ddnFit}</p>
                    </div>
                  </>
                ) : null}
              </article>
              {index < STAGE_ORDER.length - 1 ? (
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.conversationMode}>
          <h2 className={styles.panelTitle}>Customer conversation flow</h2>
          <ul>
            <li>Start with the customer symptom</li>
            <li>Identify the workload behind it</li>
            <li>Diagnose the likely constraint</li>
            <li>Quantify the business impact</li>
          </ul>
        </article>

        <aside key={selectedWorkload} className={styles.stickyNote}>
          <p className={styles.stickyLabel}>Discovery question:</p>
          <p className={styles.stickyText}>“{workload.discoveryQuestion}”</p>
          <p className={styles.stickyWorkload}>{workload.label}</p>
        </aside>
      </section>

      <section className={styles.calloutRow} aria-label="conversation prompts">
        {CALL_OUTS.map((callout) => (
          <span key={callout} className={styles.callout}>
            {callout}
          </span>
        ))}
      </section>
    </main>
  );
}
