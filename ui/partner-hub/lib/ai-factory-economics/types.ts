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

export type ReadinessStatus = "Planned" | "Checked" | "Unavailable" | "Not connected" | "Not persistent";

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

export type AiFactorySafeError = {
  code: string;
  message: string;
  detail?: string;
};

export type AiFactoryServiceStatus = "available" | "unavailable" | "not_connected";

export type OllamaAvailability = {
  status: AiFactoryServiceStatus;
  reachable: boolean;
  baseUrl: string;
  timeoutMs: number;
  classification: "Measured";
  checkedAt: string;
  error?: AiFactorySafeError;
};

export type AiFactoryNvidiaTelemetryStatus = {
  status: "not_connected";
  classification: "Demo/mock";
  message: string;
};

export type AiFactoryHealthStatus = {
  ok: boolean;
  phase: "Phase 2";
  ollama: OllamaAvailability;
  demoModeAvailable: boolean;
  nvidiaTelemetry: AiFactoryNvidiaTelemetryStatus;
  promptExecution: "not_enabled";
  streaming: "not_enabled";
};

export type AiFactoryModelDiscoverySuccess = {
  ok: true;
  phase: "Phase 2";
  baseUrl: string;
  timeoutMs: number;
  classification: "Measured";
  models: string[];
  checkedAt: string;
};

export type AiFactoryModelDiscoveryFailure = {
  ok: false;
  phase: "Phase 2";
  baseUrl: string;
  timeoutMs: number;
  classification: "Measured";
  models: [];
  checkedAt: string;
  error: AiFactorySafeError;
};

export type AiFactoryModelDiscoveryResult = AiFactoryModelDiscoverySuccess | AiFactoryModelDiscoveryFailure;
