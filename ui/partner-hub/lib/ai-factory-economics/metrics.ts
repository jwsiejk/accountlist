import type { AiFactoryRunMetrics, AiFactoryRunMetricsInput, AiFactoryRunMetricsStatus } from "./types";

const APPROXIMATE_CHARACTERS_PER_TOKEN = 4;

function normalizeTextForTokenEstimate(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function safeElapsedMs(startMs: number | undefined, endMs: number | undefined) {
  if (typeof startMs !== "number" || typeof endMs !== "number") {
    return null;
  }

  return Math.max(0, Math.round(endMs - startMs));
}

/**
 * Estimates tokens with a deliberately simple local-only approximation.
 *
 * This is not an exact tokenizer. Phase 8 still uses roughly four normalized
 * characters per token so prompt/response content can remain transient and no
 * tokenizer dependency or cloud call is required.
 */
export function estimateTokenCount(text: string): number {
  const normalized = normalizeTextForTokenEstimate(text);
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / APPROXIMATE_CHARACTERS_PER_TOKEN));
}

export function calculateRunMetrics(input: AiFactoryRunMetricsInput): AiFactoryRunMetrics {
  const ttftMs = safeElapsedMs(input.requestStartedAtMs, input.firstChunkAtMs);
  const totalLatencyMs = safeElapsedMs(input.requestStartedAtMs, input.completedAtMs);
  const generationDurationMs = safeElapsedMs(input.firstChunkAtMs, input.completedAtMs);
  const estimatedPromptTokens = estimateTokenCount(input.promptText);
  const estimatedResponseTokens = estimateTokenCount(input.responseText);
  const estimatedTokensPerSecond =
    generationDurationMs && generationDurationMs > 0 ? estimatedResponseTokens / (generationDurationMs / 1_000) : null;

  return {
    status: input.status,
    ttftMs,
    totalLatencyMs,
    generationDurationMs,
    estimatedPromptTokens,
    estimatedResponseTokens,
    estimatedTokensPerSecond,
    classifications: {
      ttft: "Measured",
      totalLatency: "Measured",
      generationDuration: "Measured",
      promptTokens: "Estimated",
      responseTokens: "Estimated",
      tokensPerSecond: "Derived",
      gpuTelemetry: "Demo/mock",
      powerTelemetry: "Demo/mock",
      costPerRun: "Demo/mock",
    },
    note:
      "Phase 8 measures local Ollama run timing and estimates token counts only. GPU telemetry is shown as a separate snapshot; tokens/watt and real cost-per-run are not included.",
  };
}

export function formatDurationMs(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  if (value < 1_000) {
    return `${value.toLocaleString()} ms`;
  }

  return `${(value / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} s`;
}

export function formatTokenCount(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  return value.toLocaleString();
}

export function formatTokensPerSecond(value: number | null | undefined): string {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} tok/s`;
}

export function isTerminalRunMetricsStatus(status: AiFactoryRunMetricsStatus): boolean {
  return status === "completed" || status === "failed" || status === "canceled" || status === "incomplete";
}
