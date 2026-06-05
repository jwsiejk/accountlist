import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addRunToHistory,
  aggregateModelComparisons,
  createRunSummary,
  limitRunHistory,
  sortRecentRuns,
} from "./history";
import type { AiFactoryRunMetrics, AiFactoryRunSummary } from "./types";

const metrics: AiFactoryRunMetrics = {
  status: "completed",
  ttftMs: 120,
  totalLatencyMs: 1_200,
  generationDurationMs: 1_000,
  estimatedPromptTokens: 8,
  estimatedResponseTokens: 20,
  estimatedTokensPerSecond: 20,
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
  note: "test metrics",
};

function run(
  overrides: Partial<AiFactoryRunSummary> = {},
): AiFactoryRunSummary {
  return {
    id: "run-a",
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:00:01.000Z",
    model: "llama3.2:3b",
    status: "completed",
    ttftMs: 100,
    totalLatencyMs: 1_000,
    generationDurationMs: 900,
    estimatedPromptTokens: 10,
    estimatedResponseTokens: 30,
    estimatedTokensPerSecond: 33.3,
    classifications: {
      ttft: "Measured",
      totalLatency: "Measured",
      generationDuration: "Measured",
      promptTokens: "Estimated",
      responseTokens: "Estimated",
      tokensPerSecond: "Derived",
      gpuSnapshot: "Measured",
      comparison: "Derived",
    },
    gpuSnapshot: null,
    contentExcludedNote:
      "Prompt and response content are excluded from this in-memory run summary.",
    storageScope:
      "Browser memory only; cleared on page reload or when the user clears history.",
    ...overrides,
  };
}

describe("AI Factory run history", () => {
  it("creates sanitized run summaries without prompt or response content", () => {
    const summary = createRunSummary({
      id: "safe-id",
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: "2026-01-01T00:00:02.000Z",
      model: " llama3.2:3b ",
      status: "completed",
      metrics,
    });

    assert.equal(summary.id, "safe-id");
    assert.equal(summary.model, "llama3.2:3b");
    assert.equal(summary.estimatedPromptTokens, 8);
    assert.equal(summary.estimatedResponseTokens, 20);
    assert.equal(
      summary.contentExcludedNote,
      "Prompt and response content are excluded from this in-memory run summary.",
    );

    const serialized = JSON.stringify(summary);
    assert.equal(serialized.includes("secret prompt"), false);
    assert.equal(serialized.includes("secret response"), false);
    assert.equal(serialized.includes("promptText"), false);
    assert.equal(serialized.includes("responseText"), false);
  });

  it("limits history length after sorting most recent first", () => {
    const runs = [
      run({ id: "old", completedAt: "2026-01-01T00:00:01.000Z" }),
      run({ id: "new", completedAt: "2026-01-01T00:00:03.000Z" }),
      run({ id: "middle", completedAt: "2026-01-01T00:00:02.000Z" }),
    ];

    assert.deepEqual(
      limitRunHistory(runs, 2).map((item) => item.id),
      ["new", "middle"],
    );
  });

  it("sorts recent runs by completed timestamp and falls back to started timestamp", () => {
    const sorted = sortRecentRuns([
      run({
        id: "started-recent",
        completedAt: null,
        startedAt: "2026-01-01T00:00:04.000Z",
      }),
      run({ id: "completed-old", completedAt: "2026-01-01T00:00:02.000Z" }),
    ]);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ["started-recent", "completed-old"],
    );
  });

  it("adds new runs and enforces a max history length", () => {
    const next = addRunToHistory(
      [run({ id: "old", completedAt: "2026-01-01T00:00:01.000Z" })],
      run({ id: "new", completedAt: "2026-01-01T00:00:02.000Z" }),
      1,
    );

    assert.deepEqual(
      next.map((item) => item.id),
      ["new"],
    );
  });

  it("aggregates model comparisons and counts terminal statuses", () => {
    const comparisons = aggregateModelComparisons([
      run({
        id: "a1",
        model: "model-a",
        status: "completed",
        ttftMs: 100,
        totalLatencyMs: 1_000,
        estimatedTokensPerSecond: 10,
      }),
      run({
        id: "a2",
        model: "model-a",
        status: "failed",
        ttftMs: null,
        totalLatencyMs: null,
        estimatedTokensPerSecond: null,
      }),
      run({ id: "a3", model: "model-a", status: "canceled" }),
      run({ id: "a4", model: "model-a", status: "incomplete" }),
      run({
        id: "b1",
        model: "model-b",
        status: "completed",
        ttftMs: 50,
        totalLatencyMs: 500,
        estimatedTokensPerSecond: 30,
      }),
    ]);

    const modelA = comparisons.find(
      (comparison) => comparison.model === "model-a",
    );
    assert.ok(modelA);
    assert.equal(modelA.runCount, 4);
    assert.equal(modelA!.completedCount, 1);
    assert.equal(modelA!.failedCount, 1);
    assert.equal(modelA!.canceledCount, 1);
    assert.equal(modelA!.incompleteCount, 1);
    assert.equal(modelA!.classification, "Derived");
  });

  it("ignores unavailable metrics in averages instead of substituting zero", () => {
    const [comparison] = aggregateModelComparisons([
      run({
        id: "with-value",
        model: "model-a",
        ttftMs: 100,
        totalLatencyMs: 1_000,
        estimatedTokensPerSecond: 20,
      }),
      run({
        id: "missing",
        model: "model-a",
        ttftMs: null,
        totalLatencyMs: null,
        estimatedTokensPerSecond: null,
      }),
    ]);

    assert.equal(comparison.averageTtftMs, 100);
    assert.equal(comparison.averageTotalLatencyMs, 1_000);
    assert.equal(comparison.averageEstimatedTokensPerSecond, 20);
  });

  it("returns unavailable aggregate values when no valid metric exists", () => {
    const [comparison] = aggregateModelComparisons([
      run({
        id: "missing-one",
        model: "model-a",
        ttftMs: null,
        totalLatencyMs: null,
        estimatedTokensPerSecond: null,
      }),
      run({
        id: "missing-two",
        model: "model-a",
        ttftMs: null,
        totalLatencyMs: null,
        estimatedTokensPerSecond: null,
      }),
    ]);

    assert.equal(comparison.averageTtftMs, null);
    assert.equal(comparison.averageTotalLatencyMs, null);
    assert.equal(comparison.averageEstimatedTokensPerSecond, null);
    assert.equal(comparison.bestEstimatedTokensPerSecond, null);
    assert.equal(comparison.fastestTtftMs, null);
  });

  it("keeps derived labels on summary classifications", () => {
    const summary = createRunSummary({
      id: "derived-id",
      startedAt: "2026-01-01T00:00:00.000Z",
      model: "model-a",
      status: "failed",
      metrics: null,
    });

    assert.equal(summary.classifications.tokensPerSecond, "Derived");
    assert.equal(summary.classifications.comparison, "Derived");
    assert.equal(summary.estimatedTokensPerSecond, null);
  });
});
