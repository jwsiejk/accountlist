import type {
  AiFactoryRunMetricClassifications,
  AiFactoryRunMetrics,
  AiFactoryRunMetricsStatus,
  AiFactoryRunSummary,
  AiFactoryRunSummaryClassifications,
  AiFactoryRunSummaryInput,
  AiFactoryModelComparisonSummary,
} from "./types";

export const AI_FACTORY_MAX_RUN_HISTORY = 20;

const historyClassifications: AiFactoryRunSummaryClassifications = {
  ttft: "Measured",
  totalLatency: "Measured",
  generationDuration: "Measured",
  promptTokens: "Estimated",
  responseTokens: "Estimated",
  tokensPerSecond: "Derived",
  gpuSnapshot: "Measured",
  comparison: "Derived",
};

function metricClassifications(
  metrics?: AiFactoryRunMetrics | null,
): AiFactoryRunMetricClassifications {
  return (
    metrics?.classifications ?? {
      ttft: "Measured",
      totalLatency: "Measured",
      generationDuration: "Measured",
      promptTokens: "Estimated",
      responseTokens: "Estimated",
      tokensPerSecond: "Derived",
      gpuTelemetry: "Demo/mock",
      powerTelemetry: "Demo/mock",
      costPerRun: "Demo/mock",
    }
  );
}

function safeNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeCount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : null;
}

function mostRecentTimestamp(run: AiFactoryRunSummary): string {
  return run.completedAt || run.startedAt;
}

function makeRunId(input: AiFactoryRunSummaryInput): string {
  const timestamp = input.completedAt || new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ai-factory-run-${timestamp.replace(/[^0-9a-z]/gi, "")}-${suffix}`;
}

export function createRunSummary(
  input: AiFactoryRunSummaryInput,
): AiFactoryRunSummary {
  const classifications = metricClassifications(input.metrics);

  return {
    id: input.id || makeRunId(input),
    startedAt: input.startedAt,
    completedAt: input.completedAt ?? null,
    model: input.model.trim() || "Unknown local model",
    status: input.status,
    ttftMs: safeNumber(input.metrics?.ttftMs),
    totalLatencyMs: safeNumber(input.metrics?.totalLatencyMs),
    generationDurationMs: safeNumber(input.metrics?.generationDurationMs),
    estimatedPromptTokens: safeCount(input.metrics?.estimatedPromptTokens),
    estimatedResponseTokens: safeCount(input.metrics?.estimatedResponseTokens),
    estimatedTokensPerSecond: safeNumber(
      input.metrics?.estimatedTokensPerSecond,
    ),
    classifications: {
      ttft: classifications.ttft,
      totalLatency: classifications.totalLatency,
      generationDuration: classifications.generationDuration,
      promptTokens: classifications.promptTokens,
      responseTokens: classifications.responseTokens,
      tokensPerSecond: classifications.tokensPerSecond,
      gpuSnapshot: "Measured",
      comparison: "Derived",
    },
    gpuSnapshot: input.gpuSnapshot ?? null,
    contentExcludedNote:
      "Prompt and response content are excluded from this in-memory run summary.",
    storageScope:
      "Browser memory only; cleared on page reload or when the user clears history.",
  };
}

export function sortRecentRuns(
  runs: AiFactoryRunSummary[],
): AiFactoryRunSummary[] {
  return [...runs].sort(
    (a, b) =>
      Date.parse(mostRecentTimestamp(b)) - Date.parse(mostRecentTimestamp(a)),
  );
}

export function limitRunHistory(
  runs: AiFactoryRunSummary[],
  maxLength = AI_FACTORY_MAX_RUN_HISTORY,
): AiFactoryRunSummary[] {
  return sortRecentRuns(runs).slice(0, Math.max(0, maxLength));
}

export function addRunToHistory(
  history: AiFactoryRunSummary[],
  run: AiFactoryRunSummary,
  maxLength = AI_FACTORY_MAX_RUN_HISTORY,
): AiFactoryRunSummary[] {
  return limitRunHistory([run, ...history], maxLength);
}

function average(values: Array<number | null>): number | null {
  const available = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  if (available.length === 0) {
    return null;
  }

  return available.reduce((sum, value) => sum + value, 0) / available.length;
}

function min(values: Array<number | null>): number | null {
  const available = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  return available.length > 0 ? Math.min(...available) : null;
}

function max(values: Array<number | null>): number | null {
  const available = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  return available.length > 0 ? Math.max(...available) : null;
}

function isStatus(
  status: AiFactoryRunMetricsStatus,
  expected: AiFactoryRunMetricsStatus,
): boolean {
  return status === expected;
}

export function aggregateModelComparisons(
  runs: AiFactoryRunSummary[],
): AiFactoryModelComparisonSummary[] {
  const byModel = new Map<string, AiFactoryRunSummary[]>();

  for (const run of runs) {
    const model = run.model || "Unknown local model";
    byModel.set(model, [...(byModel.get(model) ?? []), run]);
  }

  return [...byModel.entries()]
    .map(([model, modelRuns]) => {
      const recentRun = sortRecentRuns(modelRuns)[0];

      return {
        model,
        runCount: modelRuns.length,
        completedCount: modelRuns.filter((run) =>
          isStatus(run.status, "completed"),
        ).length,
        failedCount: modelRuns.filter((run) => isStatus(run.status, "failed"))
          .length,
        canceledCount: modelRuns.filter((run) =>
          isStatus(run.status, "canceled"),
        ).length,
        incompleteCount: modelRuns.filter((run) =>
          isStatus(run.status, "incomplete"),
        ).length,
        averageTtftMs: average(modelRuns.map((run) => run.ttftMs)),
        averageTotalLatencyMs: average(
          modelRuns.map((run) => run.totalLatencyMs),
        ),
        averageEstimatedTokensPerSecond: average(
          modelRuns.map((run) => run.estimatedTokensPerSecond),
        ),
        bestEstimatedTokensPerSecond: max(
          modelRuns.map((run) => run.estimatedTokensPerSecond),
        ),
        fastestTtftMs: min(modelRuns.map((run) => run.ttftMs)),
        mostRecentRunAt: recentRun ? mostRecentTimestamp(recentRun) : null,
        classification: historyClassifications.comparison,
      };
    })
    .sort(
      (a, b) =>
        Date.parse(b.mostRecentRunAt ?? "") -
        Date.parse(a.mostRecentRunAt ?? ""),
    );
}
