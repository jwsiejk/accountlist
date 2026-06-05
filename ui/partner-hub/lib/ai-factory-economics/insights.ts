import { aggregateModelComparisons } from "./history";
import type {
  AiFactoryExecutiveInsight,
  AiFactoryExecutiveInsightsInput,
  AiFactoryExecutiveScorecard,
  AiFactoryModelComparisonSummary,
  AiFactoryRunMetrics,
  AiFactoryRunSummary,
} from "./types";

const LOCAL_DEMO_CAVEAT =
  "Based only on local workstation demo data and sanitized in-memory summaries; not a production benchmark or business proof.";

function isAvailableNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatMs(value: number): string {
  return `${Math.round(value).toLocaleString()} ms`;
}

function formatTokensPerSecond(value: number): string {
  return `${value.toFixed(1)} estimated tokens/sec`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function findFastestTtft(
  comparisons: AiFactoryModelComparisonSummary[],
): AiFactoryModelComparisonSummary | null {
  return comparisons.reduce<AiFactoryModelComparisonSummary | null>(
    (best, comparison) => {
      if (!isAvailableNumber(comparison.averageTtftMs)) {
        return best;
      }

      if (!best || comparison.averageTtftMs < (best.averageTtftMs ?? Infinity)) {
        return comparison;
      }

      return best;
    },
    null,
  );
}

function findHighestThroughput(
  comparisons: AiFactoryModelComparisonSummary[],
): AiFactoryModelComparisonSummary | null {
  return comparisons.reduce<AiFactoryModelComparisonSummary | null>(
    (best, comparison) => {
      if (!isAvailableNumber(comparison.averageEstimatedTokensPerSecond)) {
        return best;
      }

      if (
        !best ||
        comparison.averageEstimatedTokensPerSecond >
          (best.averageEstimatedTokensPerSecond ?? -Infinity)
      ) {
        return comparison;
      }

      return best;
    },
    null,
  );
}

function findMostReliable(
  comparisons: AiFactoryModelComparisonSummary[],
): AiFactoryModelComparisonSummary | null {
  return comparisons.reduce<AiFactoryModelComparisonSummary | null>(
    (best, comparison) => {
      if (comparison.runCount === 0) {
        return best;
      }

      const completionRate = comparison.completedCount / comparison.runCount;
      const bestCompletionRate = best
        ? best.completedCount / Math.max(1, best.runCount)
        : -1;

      if (
        !best ||
        completionRate > bestCompletionRate ||
        (completionRate === bestCompletionRate &&
          comparison.completedCount > best.completedCount)
      ) {
        return comparison;
      }

      return best;
    },
    null,
  );
}

function completedRunCount(runs: AiFactoryRunSummary[]): number {
  return runs.filter((run) => run.status === "completed").length;
}

function nonCompletedRunCount(runs: AiFactoryRunSummary[]): number {
  return runs.filter((run) => run.status !== "completed").length;
}

function latestRunHasMetrics(
  latestRunMetrics?: AiFactoryRunMetrics | null,
  runs: AiFactoryRunSummary[] = [],
): boolean {
  return Boolean(
    latestRunMetrics ||
      runs.some(
        (run) =>
          isAvailableNumber(run.ttftMs) ||
          isAvailableNumber(run.totalLatencyMs) ||
          isAvailableNumber(run.estimatedTokensPerSecond),
      ),
  );
}

export function calculateCompletionRate(runs: AiFactoryRunSummary[]): number | null {
  if (runs.length === 0) {
    return null;
  }

  return (completedRunCount(runs) / runs.length) * 100;
}

export function buildAiFactoryExecutiveScorecards({
  runs,
  comparisons = aggregateModelComparisons(runs),
  latestRunMetrics = null,
  ollamaAvailable,
  gpuSnapshotAvailable,
}: AiFactoryExecutiveInsightsInput): AiFactoryExecutiveScorecard[] {
  const fastest = findFastestTtft(comparisons);
  const throughput = findHighestThroughput(comparisons);
  const completionRate = calculateCompletionRate(runs);
  const telemetrySignals = [
    ollamaAvailable === true,
    latestRunHasMetrics(latestRunMetrics, runs),
    gpuSnapshotAvailable === true,
  ];
  const telemetryCoverage = telemetrySignals.filter(Boolean).length;

  return [
    {
      id: "runs-compared",
      title: "Runs compared",
      value: runs.length.toLocaleString(),
      detail: "Sanitized browser-memory summaries only; prompt and response content are excluded.",
      classification: "Derived",
    },
    {
      id: "best-ttft",
      title: "Best avg TTFT",
      value: isAvailableNumber(fastest?.averageTtftMs)
        ? formatMs(fastest.averageTtftMs)
        : "Unavailable",
      detail: fastest
        ? `${fastest.model} has the fastest available average TTFT in current history.`
        : "Run completed prompts with measured TTFT before this scorecard is available.",
      classification: "Derived",
      supportingMetric: fastest?.model,
    },
    {
      id: "best-throughput",
      title: "Best avg throughput",
      value: isAvailableNumber(throughput?.averageEstimatedTokensPerSecond)
        ? formatTokensPerSecond(throughput.averageEstimatedTokensPerSecond)
        : "Unavailable",
      detail: throughput
        ? `${throughput.model} has the highest available average derived estimated tokens/sec.`
        : "Run completed prompts with generation timing before this scorecard is available.",
      classification: "Derived",
      supportingMetric: throughput?.model,
    },
    {
      id: "completion-rate",
      title: "Completion rate",
      value: completionRate === null ? "Unavailable" : formatPercent(completionRate),
      detail:
        completionRate === null
          ? "No in-memory runs have been recorded yet."
          : `${completedRunCount(runs)} of ${runs.length} current in-memory runs completed.`,
      classification: "Derived",
      supportingMetric: completionRate === null ? undefined : `${completedRunCount(runs)}/${runs.length}`,
    },
    {
      id: "telemetry-coverage",
      title: "Telemetry coverage",
      value: `${telemetryCoverage}/3 signals`,
      detail:
        "Signals are Ollama availability when exposed, recent run metrics, and optional NVIDIA GPU snapshot availability.",
      classification: "Derived",
      supportingMetric: `Ollama ${ollamaAvailable === true ? "available" : "not confirmed"}; run metrics ${latestRunHasMetrics(latestRunMetrics, runs) ? "available" : "not yet"}; GPU snapshot ${gpuSnapshotAvailable === true ? "available" : "not confirmed"}`,
    },
  ];
}

export function buildAiFactoryExecutiveInsights({
  runs,
  comparisons = aggregateModelComparisons(runs),
  latestRunMetrics = null,
  gpuSnapshotAvailable,
}: AiFactoryExecutiveInsightsInput): AiFactoryExecutiveInsight[] {
  const insights: AiFactoryExecutiveInsight[] = [];
  const fastest = findFastestTtft(comparisons);
  const throughput = findHighestThroughput(comparisons);
  const reliable = findMostReliable(comparisons);
  const incompleteCount = nonCompletedRunCount(runs);

  if (runs.length === 0) {
    insights.push({
      id: "no-history-yet",
      title: "No in-memory run history yet",
      explanation:
        "Run several local prompts to populate sanitized summaries and unlock model comparison recommendations.",
      severity: "info",
      classification: "Configured",
      caveat:
        "History is intentionally browser-memory only and disappears on page reload.",
    });
  }

  if (isAvailableNumber(fastest?.averageTtftMs)) {
    insights.push({
      id: "fastest-ttft",
      title: `Fastest average TTFT: ${fastest.model}`,
      explanation:
        "This model produced the lowest available average time-to-first-token in the current in-memory history.",
      severity: "good",
      classification: "Derived",
      supportingMetric: formatMs(fastest.averageTtftMs),
      caveat: LOCAL_DEMO_CAVEAT,
    });
  }

  if (isAvailableNumber(throughput?.averageEstimatedTokensPerSecond)) {
    insights.push({
      id: "highest-throughput",
      title: `Highest average throughput: ${throughput.model}`,
      explanation:
        "This model produced the highest available average derived estimated tokens/sec in the current in-memory history.",
      severity: "good",
      classification: "Derived",
      supportingMetric: formatTokensPerSecond(
        throughput.averageEstimatedTokensPerSecond,
      ),
      caveat:
        "Tokens/sec is derived from estimated response tokens and measured generation duration. It is local demo guidance only.",
    });
  }

  if (reliable) {
    const rate = (reliable.completedCount / reliable.runCount) * 100;
    insights.push({
      id: "most-reliable",
      title: `Highest completion rate: ${reliable.model}`,
      explanation:
        "This model has the highest completed-run percentage among models in current browser-memory history.",
      severity: rate >= 80 ? "good" : "info",
      classification: "Derived",
      supportingMetric: `${reliable.completedCount}/${reliable.runCount} completed (${formatPercent(rate)})`,
      caveat: LOCAL_DEMO_CAVEAT,
    });
  }

  if (runs.length > 0 && incompleteCount > completedRunCount(runs)) {
    insights.push({
      id: "completion-warning",
      title: "Most recent runs are not completing",
      explanation:
        "Failed, canceled, and incomplete runs outnumber completed runs in the current in-memory history.",
      severity: "warning",
      classification: "Derived",
      supportingMetric: `${incompleteCount}/${runs.length} not completed`,
      caveat:
        "Check local Ollama availability, selected model readiness, and prompt size before treating this as model behavior.",
    });
  }

  insights.push({
    id: "token-count-caveat",
    title: "Token counts are estimates",
    explanation:
      "Prompt and response token counts use a rough local approximation, so derived throughput is directional only.",
    severity: "info",
    classification: "Configured",
    caveat: "Do not present estimated token counts as exact tokenizer counts.",
  });

  insights.push({
    id: "gpu-snapshot-caveat",
    title:
      gpuSnapshotAvailable === true
        ? "GPU telemetry is snapshot-only"
        : "GPU telemetry is unavailable or not confirmed",
    explanation:
      gpuSnapshotAvailable === true
        ? "NVIDIA telemetry is a point-in-time nvidia-smi snapshot and is not exact per-run attribution."
        : "The demo still works without GPU telemetry; any unavailable GPU values are not treated as zero.",
    severity: gpuSnapshotAvailable === true ? "info" : "warning",
    classification: "Configured",
    caveat:
      "Do not claim lab-grade power measurement or exact per-process GPU attribution.",
  });

  if (comparisons.length < 2) {
    insights.push({
      id: "compare-two-models",
      title: "Try comparing two models with the same prompt",
      explanation:
        "Using the same prompt across two local models makes the derived comparison table easier to explain in a demo.",
      severity: "info",
      classification: "Configured",
      caveat:
        "This is static demo guidance, not an automated benchmark recommendation.",
    });
  }

  if (latestRunHasMetrics(latestRunMetrics, runs)) {
    insights.push({
      id: "runtime-interpretation",
      title: "Runtime metrics explain responsiveness and throughput",
      explanation:
        "TTFT reflects first-token responsiveness; latency reflects end-to-end run time; estimated tokens/sec reflects generation pace.",
      severity: "info",
      classification: "Configured",
      caveat:
        "Use these labels to explain the demo, not to claim production performance validity.",
    });
  }

  return insights;
}
