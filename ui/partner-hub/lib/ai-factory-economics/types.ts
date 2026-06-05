export type MetricClassification =
  | "Measured"
  | "Estimated"
  | "Derived"
  | "Configured"
  | "Demo/mock";

export type MetricTone = "default" | "good" | "warning" | "info";

export type AiFactoryMetric = {
  id: string;
  label: string;
  value: string;
  classification: MetricClassification;
  description: string;
  tone?: MetricTone;
};

export type ReadinessStatus =
  | "Planned"
  | "Checked"
  | "Unavailable"
  | "Not connected"
  | "Not persistent";

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

export type AiFactoryServiceStatus =
  | "available"
  | "unavailable"
  | "not_connected";

export type AiFactoryGpuTelemetryAvailabilityStatus =
  | "available"
  | "unavailable";

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
  status: "snapshot_endpoint_available";
  classification: "Measured";
  message: string;
};

export type AiFactoryGpuTelemetryFieldClassifications = {
  availability: "Measured";
  utilizationGpuPercent: "Measured";
  memoryUsedMb: "Measured";
  memoryTotalMb: "Measured";
  powerDrawWatts: "Measured";
  temperatureGpuCelsius: "Measured";
};

export type AiFactoryGpuTelemetrySnapshot = {
  index: number | null;
  utilizationGpuPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  powerDrawWatts: number | null;
  temperatureGpuCelsius: number | null;
  sampledAt: string;
  classifications: AiFactoryGpuTelemetryFieldClassifications;
};

export type AiFactoryGpuErrorCode =
  | "NVIDIA_SMI_NOT_FOUND"
  | "NVIDIA_SMI_TIMEOUT"
  | "NVIDIA_SMI_UNSUPPORTED"
  | "NVIDIA_SMI_EMPTY_OUTPUT"
  | "NVIDIA_SMI_UNAVAILABLE";

export type AiFactorySafeGpuError = AiFactorySafeError & {
  code: AiFactoryGpuErrorCode;
};

export type AiFactoryGpuTelemetrySuccess = {
  ok: true;
  phase: "Phase 8";
  status: "available";
  available: true;
  timeoutMs: number;
  checkedAt: string;
  classification: "Measured";
  defaultGpuIndex: number | null;
  gpus: AiFactoryGpuTelemetrySnapshot[];
};

export type AiFactoryGpuTelemetryUnavailable = {
  ok: false;
  phase: "Phase 8";
  status: "unavailable";
  available: false;
  timeoutMs: number;
  checkedAt: string;
  classification: "Measured";
  gpus: [];
  error: AiFactorySafeGpuError;
};

export type AiFactoryGpuTelemetryResult =
  | AiFactoryGpuTelemetrySuccess
  | AiFactoryGpuTelemetryUnavailable;

export type AiFactoryHealthStatus = {
  ok: boolean;
  phase: "Phase 8";
  ollama: OllamaAvailability;
  demoModeAvailable: boolean;
  nvidiaTelemetry: AiFactoryNvidiaTelemetryStatus;
  promptExecution: "enabled";
  streaming: "enabled";
};

export type AiFactoryModelDiscoverySuccess = {
  ok: true;
  phase: "Phase 8";
  baseUrl: string;
  timeoutMs: number;
  classification: "Measured";
  models: string[];
  checkedAt: string;
};

export type AiFactoryModelDiscoveryFailure = {
  ok: false;
  phase: "Phase 8";
  baseUrl: string;
  timeoutMs: number;
  classification: "Measured";
  models: [];
  checkedAt: string;
  error: AiFactorySafeError;
};

export type AiFactoryModelDiscoveryResult =
  | AiFactoryModelDiscoverySuccess
  | AiFactoryModelDiscoveryFailure;

export type AiFactoryRunMetricsStatus =
  | "running"
  | "completed"
  | "failed"
  | "canceled"
  | "incomplete";

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

export type AiFactoryRunSummaryClassifications = {
  ttft: "Measured";
  totalLatency: "Measured";
  generationDuration: "Measured";
  promptTokens: "Estimated";
  responseTokens: "Estimated";
  tokensPerSecond: "Derived";
  gpuSnapshot: "Measured";
  comparison: "Derived";
};

export type AiFactoryRunGpuSnapshotSummary = {
  sampledAt: string;
  utilizationGpuPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  powerDrawWatts: number | null;
  temperatureGpuCelsius: number | null;
  note: "Sampled NVIDIA snapshot near run completion; not exact per-run attribution.";
};

export type AiFactoryRunSummary = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  model: string;
  status: AiFactoryRunMetricsStatus;
  ttftMs: number | null;
  totalLatencyMs: number | null;
  generationDurationMs: number | null;
  estimatedPromptTokens: number | null;
  estimatedResponseTokens: number | null;
  estimatedTokensPerSecond: number | null;
  classifications: AiFactoryRunSummaryClassifications;
  gpuSnapshot: AiFactoryRunGpuSnapshotSummary | null;
  contentExcludedNote: "Prompt and response content are excluded from this in-memory run summary.";
  storageScope: "Browser memory only; cleared on page reload or when the user clears history.";
};

export type AiFactoryRunSummaryInput = {
  id?: string;
  startedAt: string;
  completedAt?: string | null;
  model: string;
  status: AiFactoryRunMetricsStatus;
  metrics?: AiFactoryRunMetrics | null;
  gpuSnapshot?: AiFactoryRunGpuSnapshotSummary | null;
};

export type AiFactoryModelComparisonSummary = {
  model: string;
  runCount: number;
  completedCount: number;
  failedCount: number;
  canceledCount: number;
  incompleteCount: number;
  averageTtftMs: number | null;
  averageTotalLatencyMs: number | null;
  averageEstimatedTokensPerSecond: number | null;
  bestEstimatedTokensPerSecond: number | null;
  fastestTtftMs: number | null;
  mostRecentRunAt: string | null;
  classification: "Derived";
};

export type AiFactoryRunMetricsEventPayload = AiFactoryRunMetrics & {
  eventGeneratedAt: string;
};

export type AiFactoryRunMetaEventPayload = {
  ok: true;
  phase: "Phase 8";
  model: string;
  baseUrl: string;
  classification: "Measured";
  economicsClassification: "Demo/mock";
  message: string;
};

export type AiFactoryRunStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "canceled"
  | "incomplete";

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

export type AiFactoryRunValidationResult =
  | AiFactoryRunValidationSuccess
  | AiFactoryRunValidationFailure;

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

export type AiFactoryRunStreamEvent =
  | "meta"
  | "chunk"
  | "metrics"
  | "done"
  | "error";

export type AiFactoryRunStreamChunk = {
  response: string;
  done: boolean;
};

export type AiFactoryExecutiveInsightSeverity = "info" | "good" | "warning";

export type AiFactoryExecutiveInsightClassification =
  | "Derived"
  | "Configured";

export type AiFactoryExecutiveInsight = {
  id: string;
  title: string;
  explanation: string;
  severity: AiFactoryExecutiveInsightSeverity;
  classification: AiFactoryExecutiveInsightClassification;
  supportingMetric?: string;
  caveat: string;
};

export type AiFactoryExecutiveScorecard = {
  id: string;
  title: string;
  value: string;
  detail: string;
  classification: "Derived";
  supportingMetric?: string;
};

export type AiFactoryExecutiveInsightsInput = {
  runs: AiFactoryRunSummary[];
  comparisons?: AiFactoryModelComparisonSummary[];
  latestRunMetrics?: AiFactoryRunMetrics | null;
  ollamaAvailable?: boolean;
  gpuSnapshotAvailable?: boolean;
};
