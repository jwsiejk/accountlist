"use client";

import { useMemo, useState } from "react";
import styles from "./whiteboard.module.css";

type SymptomKey = "backtests" | "riskRuns" | "fraudDelayed" | "gpuUnderutilized" | "aiPilotsStuck";
type FlowStageKey =
  | "customerSays"
  | "outcomeAtRisk"
  | "workflowDelay"
  | "likelyConstraint"
  | "businessImpact"
  | "bestNextQuestion"
  | "ddnHypothesis";

type FlowContent = {
  label: string;
  stages: Record<FlowStageKey, string>;
};

const SYMPTOM_ORDER: SymptomKey[] = ["backtests", "riskRuns", "fraudDelayed", "gpuUnderutilized", "aiPilotsStuck"];

const FLOW_STAGE_ORDER: Array<{ key: FlowStageKey; label: string }> = [
  { key: "customerSays", label: "Customer says" },
  { key: "outcomeAtRisk", label: "Outcome at risk" },
  { key: "workflowDelay", label: "Workflow delay" },
  { key: "likelyConstraint", label: "Likely constraint" },
  { key: "businessImpact", label: "Business impact" },
  { key: "bestNextQuestion", label: "Best next question" },
  { key: "ddnHypothesis", label: "DDN hypothesis" },
];

const SYMPTOM_FLOWS: Record<SymptomKey, FlowContent> = {
  backtests: {
    label: "Backtests take too long",
    stages: {
      customerSays: "Backtests take too long.",
      outcomeAtRisk: "Research velocity slows down and fewer strategies get tested.",
      workflowDelay: "Large historical datasets take too long to access, reuse, or process across research runs.",
      likelyConstraint: "Data movement, metadata overhead, or shared filesystem performance may be limiting throughput.",
      businessImpact: "Slower time-to-alpha and fewer opportunities evaluated before markets move.",
      bestNextQuestion:
        "How many strategies are delayed because backtests cannot complete inside the target window?",
      ddnHypothesis:
        "Validate whether the data path is slowing research iteration and whether a high-performance shared data layer would reduce wait time.",
    },
  },
  riskRuns: {
    label: "Risk runs are still overnight",
    stages: {
      customerSays: "Risk runs are still overnight.",
      outcomeAtRisk: "The firm cannot make faster risk decisions during the trading day.",
      workflowDelay: "Risk models and stress scenarios are waiting on data access, preparation, or processing windows.",
      likelyConstraint:
        "The bottleneck may be data throughput, concurrent access, or infrastructure unable to support intraday runs.",
      businessImpact: "Exposure remains open longer and the business has less time to react.",
      bestNextQuestion: "What would change operationally if that risk run finished in hours instead of overnight?",
      ddnHypothesis:
        "Validate whether faster access to model inputs and scenario data could compress the risk window.",
    },
  },
  fraudDelayed: {
    label: "Fraud response is delayed",
    stages: {
      customerSays: "Fraud response is delayed.",
      outcomeAtRisk: "Fraud decisions happen too late to prevent loss or customer impact.",
      workflowDelay:
        "Detection, scoring, or investigation workflows are slowed by data availability and analysis time.",
      likelyConstraint:
        "The issue may be ingest, feature access, model scoring latency, or analytics pipeline performance.",
      businessImpact: "Loss exposure increases and customer trust can be damaged.",
      bestNextQuestion: "Where does the fraud workflow lose the most time between event, score, and action?",
      ddnHypothesis: "Validate whether data pipeline performance is delaying fraud analytics or model response.",
    },
  },
  gpuUnderutilized: {
    label: "GPUs are underutilized",
    stages: {
      customerSays: "GPUs are underutilized.",
      outcomeAtRisk: "AI infrastructure spend is not translating into model velocity.",
      workflowDelay: "Training, checkpointing, or data loading is slowing the AI pipeline.",
      likelyConstraint: "Data feeding, checkpointing, or dataset reuse may be limiting expensive compute.",
      businessImpact: "Higher GPU ROI, faster time-to-model, and better use of AI infrastructure spend.",
      bestNextQuestion: "What does GPU utilization look like during training, and when does it drop?",
      ddnHypothesis: "Validate whether the data pipeline is starving GPUs or slowing checkpoint and restart cycles.",
    },
  },
  aiPilotsStuck: {
    label: "AI pilots are stuck",
    stages: {
      customerSays: "AI pilots are stuck.",
      outcomeAtRisk: "The organization is not converting AI experimentation into repeatable production value.",
      workflowDelay:
        "Data preparation, model iteration, governance, or infrastructure scaling is slowing the move from pilot to production.",
      likelyConstraint:
        "The infrastructure may not support repeatable access to large datasets across teams and pipelines.",
      businessImpact: "AI investment remains trapped in experimentation instead of business outcomes.",
      bestNextQuestion: "What is preventing the pilot from becoming a repeatable production workflow?",
      ddnHypothesis:
        "Validate whether a production-grade data foundation is needed to support repeatable AI workloads.",
    },
  },
};

export default function DdnFsiWhiteboardPage() {
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomKey>("gpuUnderutilized");
  const selectedFlow = useMemo(() => SYMPTOM_FLOWS[selectedSymptom], [selectedSymptom]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>DDN FSI Discovery Talk Track</h1>
        <p className={styles.subtitle}>
          Start with the customer outcome, then validate whether data is the constraint.
        </p>
        <p className={styles.anchorQuestion}>
          What outcome needs to happen faster — and what happens when it doesn’t?
        </p>
      </header>

      <section className={styles.workspace} aria-label="DDN guided discovery flow">
        <aside className={styles.symptomRail}>
          <h2 className={styles.railTitle}>Customer symptom</h2>
          <div className={styles.symptomList} role="listbox" aria-label="Select a customer symptom">
            {SYMPTOM_ORDER.map((symptomKey) => {
              const symptom = SYMPTOM_FLOWS[symptomKey];
              const isSelected = selectedSymptom === symptomKey;

              return (
                <button
                  key={symptomKey}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.symptomButton} ${isSelected ? styles.symptomButtonActive : ""}`}
                  onClick={() => setSelectedSymptom(symptomKey)}
                >
                  {symptom.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.flowArea}>
          <div className={styles.flowCards}>
            {FLOW_STAGE_ORDER.map((stage) => (
              <article key={stage.key} className={styles.flowCard}>
                <h3>{stage.label}</h3>
                <p>{selectedFlow.stages[stage.key]}</p>
              </article>
            ))}
          </div>

          <aside className={styles.validationBox}>
            <h2>Validate before positioning DDN</h2>
            <ul>
              <li>What metric proves or disproves the constraint?</li>
              <li>Who owns the delayed workflow?</li>
              <li>What changes if the delay is removed?</li>
            </ul>
          </aside>
        </section>
      </section>

      <footer className={styles.footerNote}>
        The goal is not to pitch storage first. The goal is to connect workflow delay to measurable business impact,
        then test whether the data path is the constraint.
      </footer>
    </main>
  );
}
