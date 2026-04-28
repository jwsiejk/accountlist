"use client";

import { useMemo, useState } from "react";
import styles from "./whiteboard.module.css";

type WorkloadKey = "quantResearch" | "riskModeling" | "fraudDetection" | "aiGenAI";
type StageKey = "dataSources" | "ingest" | "dataAccessLayer" | "compute" | "workloads" | "businessOutcomes";

type WorkloadContent = {
  label: string;
  stages: Record<StageKey, string[]>;
  discoveryQuestion: string;
  ddnFit: string;
};

const STAGE_ORDER: Array<{ key: StageKey; label: string; step: number }> = [
  { key: "dataSources", label: "Data Sources", step: 1 },
  { key: "ingest", label: "Ingest", step: 2 },
  { key: "dataAccessLayer", label: "Data Access", step: 3 },
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

const CALL_OUTS = ["Where does it slow down?", "Is compute waiting on data?", "What outcome matters?"];

export default function DdnFsiWhiteboardPage() {
  const [selectedWorkload, setSelectedWorkload] = useState<WorkloadKey>("quantResearch");
  const workload = useMemo(() => WORKLOADS[selectedWorkload], [selectedWorkload]);

  return (
    <main className={styles.page}>
      <section className={styles.headerSection}>
        <p className={styles.kicker}>DDN FSI conversation whiteboard</p>
        <h1 className={styles.title}>DDN FSI Pipeline Whiteboard</h1>
        <p className={styles.subtitle}>
          A simple way to identify where financial services data pipelines break — and where DDN creates measurable
          impact.
        </p>
        <p className={styles.structureNote}>The structure stays consistent. The pressure points change by workload.</p>
        <p className={styles.loomHint}>Walk left-to-right. Identify the constraint. Tie it to an outcome.</p>
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
                onClick={() => setSelectedWorkload(workloadKey)}
              >
                {WORKLOADS[workloadKey].label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={styles.resetButton}
          onClick={() => setSelectedWorkload("quantResearch")}
          disabled={selectedWorkload === "quantResearch"}
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
                    <p className={styles.dataAccessCallout}>This is usually where DDN enters the conversation.</p>
                    <div className={styles.ddnFitPanel}>
                      <p className={styles.ddnFitLabel}>DDN fit: remove the data bottleneck</p>
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
          <h2 className={styles.panelTitle}>Customer conversation mode</h2>
          <ol>
            <li>Start with the business workload</li>
            <li>Map the pipeline</li>
            <li>Find the constraint</li>
            <li>Tie DDN to measurable impact</li>
          </ol>
          <h3 className={styles.talkTrackTitle}>2-minute talk track</h3>
          <ul>
            <li>Start with the business workload</li>
            <li>Map the data flow</li>
            <li>Find where data access slows the pipeline</li>
            <li>Connect DDN to the measurable outcome</li>
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
