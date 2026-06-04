export type MetricClassification = "Measured" | "Estimated" | "Derived" | "Configured" | "Demo/mock";

export type MetricTone = "default" | "good" | "warning" | "info";

export type AiFactoryMetric = {
  id: string;
  label: string;
  value: string;
  classification: MetricClassification;
  description: string;
  tone?: MetricTone;
};

export type ReadinessStatus = "Planned" | "Not connected" | "Not persistent";

export type ReadinessItem = {
  title: string;
  status: ReadinessStatus;
  classification: MetricClassification;
  description: string;
};

export type PhaseStatus = {
  phase: string;
  title: string;
  status: string;
  description: string;
  active?: boolean;
};

export type AiFactoryEconomicsMockDashboard = {
  scenarioName: string;
  summary: string;
  assumptions: AiFactoryMetric[];
  metrics: AiFactoryMetric[];
  readiness: ReadinessItem[];
  phases: PhaseStatus[];
};
