import assert from "node:assert/strict";
import test from "node:test";

import { calculateRunMetrics, estimateTokenCount } from "./metrics";

test("estimateTokenCount uses a documented rough four-character approximation", () => {
  assert.equal(estimateTokenCount("abcd"), 1);
  assert.equal(estimateTokenCount("abcde"), 2);
  assert.equal(estimateTokenCount("hello local model"), 5);
});

test("estimateTokenCount returns zero for empty strings", () => {
  assert.equal(estimateTokenCount(""), 0);
});

test("estimateTokenCount normalizes whitespace safely", () => {
  assert.equal(estimateTokenCount("   \n\t   "), 0);
  assert.equal(estimateTokenCount("hello\n\nlocal\tmodel"), estimateTokenCount("hello local model"));
});

test("calculateRunMetrics calculates measured timing and estimated token counts", () => {
  const metrics = calculateRunMetrics({
    promptText: "hello",
    responseText: "abcd efgh",
    requestStartedAtMs: 1_000,
    firstChunkAtMs: 1_250,
    completedAtMs: 2_250,
    status: "completed",
  });

  assert.equal(metrics.status, "completed");
  assert.equal(metrics.ttftMs, 250);
  assert.equal(metrics.totalLatencyMs, 1_250);
  assert.equal(metrics.generationDurationMs, 1_000);
  assert.equal(metrics.estimatedPromptTokens, 2);
  assert.equal(metrics.estimatedResponseTokens, 3);
  assert.equal(metrics.classifications.ttft, "Measured");
  assert.equal(metrics.classifications.promptTokens, "Estimated");
  assert.equal(metrics.classifications.tokensPerSecond, "Derived");
  assert.equal(metrics.classifications.gpuTelemetry, "Demo/mock");
});

test("calculateRunMetrics derives estimated tokens/sec from estimated response tokens and measured generation duration", () => {
  const metrics = calculateRunMetrics({
    promptText: "prompt",
    responseText: "abcdefghijklmnop",
    requestStartedAtMs: 0,
    firstChunkAtMs: 500,
    completedAtMs: 2_500,
    status: "completed",
  });

  assert.equal(metrics.estimatedResponseTokens, 4);
  assert.equal(metrics.generationDurationMs, 2_000);
  assert.equal(metrics.estimatedTokensPerSecond, 2);
});

test("calculateRunMetrics handles zero or missing generation duration without division-by-zero", () => {
  const zeroDuration = calculateRunMetrics({
    promptText: "prompt",
    responseText: "response",
    requestStartedAtMs: 100,
    firstChunkAtMs: 200,
    completedAtMs: 200,
    status: "completed",
  });
  assert.equal(zeroDuration.generationDurationMs, 0);
  assert.equal(zeroDuration.estimatedTokensPerSecond, null);

  const missingDuration = calculateRunMetrics({
    promptText: "prompt",
    responseText: "response",
    requestStartedAtMs: 100,
    status: "running",
  });
  assert.equal(missingDuration.ttftMs, null);
  assert.equal(missingDuration.totalLatencyMs, null);
  assert.equal(missingDuration.generationDurationMs, null);
  assert.equal(missingDuration.estimatedTokensPerSecond, null);
});

test("calculateRunMetrics keeps incomplete streams labeled without completed-run latency", () => {
  const metrics = calculateRunMetrics({
    promptText: "prompt",
    responseText: "partial response",
    requestStartedAtMs: 1_000,
    firstChunkAtMs: 1_200,
    status: "incomplete",
  });

  assert.equal(metrics.status, "incomplete");
  assert.equal(metrics.ttftMs, 200);
  assert.equal(metrics.totalLatencyMs, null);
  assert.equal(metrics.generationDurationMs, null);
  assert.equal(metrics.estimatedResponseTokens, 4);
  assert.equal(metrics.estimatedTokensPerSecond, null);
});
