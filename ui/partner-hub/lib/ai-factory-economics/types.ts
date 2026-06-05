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
  phase: "Phase 4";
  ollama: OllamaAvailability;
  demoModeAvailable: boolean;
  nvidiaTelemetry: AiFactoryNvidiaTelemetryStatus;
  promptExecution: "enabled";
  streaming: "enabled";
};

export type AiFactoryModelDiscoverySuccess = {
  ok: true;
  phase: "Phase 4";
  baseUrl: string;
  timeoutMs: number;
  classification: "Measured";
  models: string[];
  checkedAt: string;
};

export type AiFactoryModelDiscoveryFailure = {
  ok: false;
  phase: "Phase 4";
  baseUrl: string;
  timeoutMs: number;
  classification: "Measured";
  models: [];
  checkedAt: string;
  error: AiFactorySafeError;
};

export type AiFactoryModelDiscoveryResult = AiFactoryModelDiscoverySuccess | AiFactoryModelDiscoveryFailure;


export type AiFactoryRunMetricsStatus = "running" | "completed" | "failed" | "canceled" | "incomplete";

export type AiFactoryRunMetricClassifications = {
  ttft: "Measured";
  totalLatency: "Measured";
  generationDuration: "Measured";
  promptTokens: "Estimated";
  responseTokens: "Estimated";
  tokensPerSecond: "Derived";
  gpuTelemetry: "Demo/mock";
  powerTelemetry: "Demo/mock";
  costPerRun: "Demo/mock";
};

export type AiFactoryRunMetricsInput = {
  promptText: string;
  responseText: string;
  requestStartedAtMs: number;
  firstChunkAtMs?: number;
  completedAtMs?: number;
  status: AiFactoryRunMetricsStatus;
};

export type AiFactoryRunMetrics = {
  status: AiFactoryRunMetricsStatus;
  ttftMs: number | null;
  totalLatencyMs: number | null;
  generationDurationMs: number | null;
  estimatedPromptTokens: number;
  estimatedResponseTokens: number;
  estimatedTokensPerSecond: number | null;
  classifications: AiFactoryRunMetricClassifications;
  note: string;
};

export type AiFactoryRunMetricsEventPayload = AiFactoryRunMetrics & {
  eventGeneratedAt: string;
};

export type AiFactoryRunMetaEventPayload = {
  ok: true;
  phase: "Phase 4";
  model: string;
  baseUrl: string;
  classification: "Measured";
  economicsClassification: "Demo/mock";
  message: string;
};

export type AiFactoryRunStatus = "idle" | "running" | "completed" | "failed" | "canceled";

export type AiFactoryRunRequest = {
  model: string;
  prompt: string;
};

export type AiFactoryRunValidationSuccess = {
  ok: true;
  request: AiFactoryRunRequest;
};

export type AiFactoryRunValidationFailure = {
  ok: false;
  error: AiFactorySafeError;
  status: number;
};

export type AiFactoryRunValidationResult = AiFactoryRunValidationSuccess | AiFactoryRunValidationFailure;

export type AiFactoryRunErrorCode =
  | "INVALID_JSON"
  | "MODEL_REQUIRED"
  | "MODEL_TOO_LONG"
  | "MODEL_INVALID"
  | "PROMPT_REQUIRED"
  | "PROMPT_TOO_LONG"
  | "OLLAMA_TIMEOUT"
  | "OLLAMA_UNAVAILABLE"
  | "OLLAMA_BAD_RESPONSE";

export type AiFactoryRunError = AiFactorySafeError & {
  code: AiFactoryRunErrorCode;
};

export type AiFactoryRunStreamEvent = "meta" | "chunk" | "metrics" | "done" | "error";

export type AiFactoryRunStreamChunk = {
  response: string;
  done: boolean;
};
