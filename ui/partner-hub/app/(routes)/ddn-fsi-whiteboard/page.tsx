"use client";

import { useMemo, useState } from "react";
import styles from "./whiteboard.module.css";

type WorkflowKey = "quantTrading" | "riskStress" | "fraudPayments" | "aiInfrastructure" | "aiProduction";

type Workflow = {
  category: string;
  delay: string;
  pressure: string;
  loomDeepDive?: boolean;
  whyItMatters: string;
  customerSignal: string;
  translationQuestion: string;
  evidenceRequest: string;
  ddnHypothesis: string;
  nextSalesAction: string;
  stakeholders: string;
};

const WORKFLOW_ORDER: WorkflowKey[] = ["quantTrading", "riskStress", "fraudPayments", "aiInfrastructure", "aiProduction"];

const WORKFLOWS: Record<WorkflowKey, Workflow> = {
  quantTrading: {
    category: "Quant / Trading",
    delay: "Backtests take too long",
    pressure: "Algorithm development speed",
    whyItMatters:
      "Research speed drives competitive advantage. Slower backtesting means fewer strategies tested and slower algorithm development.",
    customerSignal: "Backtests take too long.",
    translationQuestion:
      "Is research compute waiting on shared historical data access, metadata performance, or dataset reuse?",
    evidenceRequest:
      "Backtest completion windows, queue time, data read patterns, dataset size, concurrency, metadata behavior, and where jobs wait.",
    ddnHypothesis:
      "If research compute is waiting on data access or shared dataset performance, DDN may be relevant as the high-performance data layer behind faster research iteration.",
    nextSalesAction:
      "Create a backtesting workflow validation session with quant research, platform engineering, and infrastructure.",
    stakeholders: "Head of research, quant researchers, platform engineering, infrastructure.",
  },
  riskStress: {
    category: "Risk / Stress Testing",
    delay: "Risk runs are still overnight",
    pressure: "Exposure window",
    whyItMatters:
      "Risk timing affects decision-making. If risk remains overnight, exposure stays open longer during the trading day.",
    customerSignal: "Risk runs are still overnight.",
    translationQuestion: "Are model inputs, scenario data, data prep, or result aggregation extending the risk window?",
    evidenceRequest:
      "Batch window timeline, data prep duration, model runtime, scenario volume, concurrency, result aggregation time, and target intraday SLA.",
    ddnHypothesis:
      "If model inputs and scenario data are extending the risk window, DDN may be relevant to help compress the workflow.",
    nextSalesAction:
      "Create an intraday risk workflow review with risk analytics, application owners, trading stakeholders, and infrastructure.",
    stakeholders: "CRO organization, risk analytics, application owners, trading stakeholders, infrastructure.",
  },
  fraudPayments: {
    category: "Fraud / Payments",
    delay: "Fraud response is delayed",
    pressure: "Time-to-action",
    whyItMatters:
      "Fraud is a time-to-action problem. Delayed response increases loss exposure and customer impact.",
    customerSignal: "Fraud response is delayed.",
    translationQuestion: "Where is time lost between event, score, investigation, and action?",
    evidenceRequest:
      "Time from event to score, score to investigation, investigation to action, historical lookup latency, false positives, and model refresh timing.",
    ddnHypothesis:
      "If data access or analytics pipeline performance is slowing fraud response, DDN may be relevant to reduce decision latency.",
    nextSalesAction:
      "Create a fraud decision-latency mapping session with fraud analytics, data engineering, risk operations, security, and infrastructure.",
    stakeholders: "Fraud analytics, data engineering, risk operations, security, infrastructure.",
  },
  aiInfrastructure: {
    category: "AI Infrastructure",
    delay: "GPUs are underutilized",
    pressure: "GPU ROI",
    loomDeepDive: true,
    whyItMatters:
      "AI infrastructure is highly visible, expensive, and executive-relevant. If GPUs are idle, AI spend is not converting into model velocity or business value.",
    customerSignal: "GPUs are underutilized.",
    translationQuestion: "Is expensive compute being starved by the data path?",
    evidenceRequest:
      "GPU utilization curve, data loader timing, checkpoint duration, restart time, job queue time, dataset size, and training throughput.",
    ddnHypothesis:
      "If the data path is limiting GPU efficiency, DDN may be relevant to improve utilization and accelerate model iteration.",
    nextSalesAction:
      "Create a GPU utilization validation workshop with AI platform, ML engineering, data engineering, and infrastructure.",
    stakeholders: "AI platform owner, ML engineering, data engineering, infrastructure, research teams.",
  },
  aiProduction: {
    category: "AI Production",
    delay: "AI pilots are stuck",
    pressure: "Production value",
    whyItMatters:
      "AI value comes from repeatable production workflows, not isolated pilots. If pilots are stuck, AI spend remains experimental.",
    customerSignal: "AI pilots are stuck.",
    translationQuestion: "Can teams repeatedly access, govern, and reuse large datasets across AI pipelines?",
    evidenceRequest:
      "Pilot-to-production blockers, dataset access time, data duplication, governance approval steps, model iteration time, production handoff gaps, and repeatable data access patterns.",
    ddnHypothesis:
      "If teams cannot repeatedly access and reuse large datasets across AI pipelines, DDN may be relevant as part of the production AI data foundation.",
    nextSalesAction:
      "Create an AI production-readiness workshop with AI leadership, data owners, governance/risk teams, infrastructure, and application owners.",
    stakeholders: "AI leadership, data owners, governance/risk teams, infrastructure, application owners.",
  },
};

const LANGUAGE_BRIDGE: Array<{ traditional: string; translated: string }> = [
  { traditional: "VM performance issue", translated: "Workflow delay" },
  { traditional: "Array latency", translated: "Data path bottleneck" },
  { traditional: "Host waiting on storage", translated: "Compute / GPU starvation" },
  { traditional: "Backup or DR window", translated: "Batch window / checkpoint / restart window" },
  { traditional: "Datastore contention", translated: "Shared dataset concurrency" },
  {
    traditional: "App owner complaint",
    translated: "Research / risk / fraud / AI pipeline owner pain",
  },
  {
    traditional: "Capacity / performance sizing",
    translated: "Dataset size, throughput, metadata, concurrency, data reuse",
  },
  {
    traditional: "Business continuity",
    translated: "Exposure window, fraud loss window, model iteration speed",
  },
  {
    traditional: "Migration / refresh event",
    translated: "Opportunity to modernize the data foundation",
  },
];

const DEEP_DIVE_FIELDS: Array<{ label: string; key: keyof Workflow }> = [
  { label: "Why this workflow matters", key: "whyItMatters" },
  { label: "Customer signal", key: "customerSignal" },
  { label: "Translation question", key: "translationQuestion" },
  { label: "Evidence I would request", key: "evidenceRequest" },
  { label: "DDN hypothesis", key: "ddnHypothesis" },
  { label: "Next sales action", key: "nextSalesAction" },
  { label: "Stakeholders to involve", key: "stakeholders" },
];

export default function DdnFsiWhiteboardPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowKey>("aiInfrastructure");
  const selected = useMemo(() => WORKFLOWS[selectedWorkflow], [selectedWorkflow]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My DDN FSI Translation Map</h1>
        <p className={styles.subtitle}>Turning infrastructure experience into HPC / AI / FSI workflow discovery</p>
        <p className={styles.povStatement}>
          I would not lead with storage. I would translate customer workflow delay into business urgency, evidence,
          and a DDN validation path.
        </p>
      </header>

      <section className={styles.briefingGrid} aria-label="DDN FSI executive briefing">
        <section className={styles.zoneOne}>
          <h2>FSI workflow delays I would listen for</h2>
          <div className={styles.workflowCards} role="group" aria-label="Select workflow delay">
            {WORKFLOW_ORDER.map((workflowKey) => {
              const workflow = WORKFLOWS[workflowKey];
              const isSelected = workflowKey === selectedWorkflow;

              return (
                <button
                  key={workflowKey}
                  type="button"
                  aria-pressed={isSelected}
                  className={`${styles.workflowCard} ${isSelected ? styles.workflowCardActive : ""}`}
                  onClick={() => setSelectedWorkflow(workflowKey)}
                >
                  <div className={styles.workflowCardHeaderRow}>
                    <h3>{workflow.category}</h3>
                    {workflow.loomDeepDive ? <span className={styles.deepDiveBadge}>Loom deep dive</span> : null}
                  </div>
                  <p>
                    <strong>Delay:</strong> {workflow.delay}
                  </p>
                  <p>
                    <strong>Pressure:</strong> {workflow.pressure}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.zoneTwo}>
          <h2>The translation I’m sharpening</h2>
          <div className={styles.bridgeTable} role="table" aria-label="Language translation bridge">
            <div className={styles.bridgeHeader} role="row">
              <span role="columnheader">Traditional infrastructure language</span>
              <span role="columnheader">DDN / HPC / AI / FSI language</span>
            </div>
            {LANGUAGE_BRIDGE.map((row) => (
              <div className={styles.bridgeRow} role="row" key={row.traditional}>
                <span role="cell">{row.traditional}</span>
                <span role="cell">{row.translated}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.zoneThree} aria-live="polite">
          <h2>Deep dive: {selected.delay}</h2>
          <div className={styles.deepDiveGrid}>
            {DEEP_DIVE_FIELDS.map((field) => {
              const isNextAction = field.key === "nextSalesAction";
              return (
                <article key={field.key} className={`${styles.deepDiveCard} ${isNextAction ? styles.nextActionCard : ""}`}>
                  <h3>{field.label}</h3>
                  <p>{selected[field.key]}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.zoneFour}>
          <h2>Field motion</h2>
          <p className={styles.motionFlow}>
            <span>Business outcome</span>
            <span aria-hidden="true">→</span>
            <span>Workflow delay</span>
            <span aria-hidden="true">→</span>
            <span>Evidence</span>
            <span aria-hidden="true">→</span>
            <span>DDN hypothesis</span>
            <span aria-hidden="true">→</span>
            <span>Next sales action</span>
          </p>
          <p className={styles.motionNote}>
            The goal is not to force product fit. The goal is to prove whether the data path is part of the business
            delay.
          </p>
        </section>
      </section>
    </main>
  );
}
