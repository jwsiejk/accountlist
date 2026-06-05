import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAiFactoryExecutiveInsights,
  buildAiFactoryExecutiveScorecards,
  calculateCompletionRate,
} from "./insights";
import type { AiFactoryRunSummary } from "./types";

function run(overrides: Partial<AiFactoryRunSummary> = {}): AiFactoryRunSummary {
  return {
    id: "run-id",
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: "2026-01-01T00:00:01.000Z",
    model: "model-a",
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

describe("AI Factory executive insights", () => {
  it("returns a no-history insight state", () => {
    const insights = buildAiFactoryExecutiveInsights({ runs: [] });
    const noHistory = insights.find((insight) => insight.id === "no-history-yet");

    assert.ok(noHistory);
    assert.equal(noHistory!.classification, "Configured");
    assert.equal(noHistory!.severity, "info");
  });

  it("derives the fastest TTFT recommendation", () => {
    const insights = buildAiFactoryExecutiveInsights({
      runs: [
        run({ id: "slow", model: "slow-model", ttftMs: 250 }),
        run({ id: "fast", model: "fast-model", ttftMs: 75 }),
      ],
    });
    const fastest = insights.find((insight) => insight.id === "fastest-ttft");

    assert.ok(fastest);
    assert.equal(fastest!.title.includes("fast-model"), true);
    assert.equal(fastest!.classification, "Derived");
    assert.equal(fastest!.supportingMetric, "75 ms");
  });

  it("derives the highest throughput recommendation", () => {
    const insights = buildAiFactoryExecutiveInsights({
      runs: [
        run({ id: "low", model: "low-model", estimatedTokensPerSecond: 12 }),
        run({ id: "high", model: "high-model", estimatedTokensPerSecond: 42.4 }),
      ],
    });
    const throughput = insights.find(
      (insight) => insight.id === "highest-throughput",
    );

    assert.ok(throughput);
    assert.equal(throughput!.title.includes("high-model"), true);
    assert.equal(throughput!.classification, "Derived");
    assert.equal(throughput!.supportingMetric, "42.4 estimated tokens/sec");
  });

  it("calculates completion rate from completed runs divided by total runs", () => {
    const runs = [
      run({ id: "completed", status: "completed" }),
      run({ id: "failed", status: "failed" }),
      run({ id: "canceled", status: "canceled" }),
      run({ id: "incomplete", status: "incomplete" }),
    ];

    assert.equal(calculateCompletionRate(runs), 25);

    const scorecard = buildAiFactoryExecutiveScorecards({ runs }).find(
      (item) => item.id === "completion-rate",
    );
    assert.ok(scorecard);
    assert.equal(scorecard!.value, "25%");
    assert.equal(scorecard!.classification, "Derived");
  });

  it("does not treat missing values as zero in scorecards or recommendations", () => {
    const runs = [
      run({
        id: "missing",
        model: "missing-model",
        ttftMs: null,
        estimatedTokensPerSecond: null,
      }),
      run({
        id: "available",
        model: "available-model",
        ttftMs: 120,
        estimatedTokensPerSecond: 20,
      }),
    ];

    const scorecards = buildAiFactoryExecutiveScorecards({ runs });
    assert.equal(
      scorecards.find((item) => item.id === "best-ttft")!.value,
      "120 ms",
    );
    assert.equal(
      scorecards.find((item) => item.id === "best-throughput")!.value,
      "20.0 estimated tokens/sec",
    );

    const insights = buildAiFactoryExecutiveInsights({ runs });
    assert.equal(
      insights.find((insight) => insight.id === "fastest-ttft")!.title,
      "Fastest average TTFT: available-model",
    );
  });

  it("generates a warning when failed, canceled, and incomplete runs dominate", () => {
    const insights = buildAiFactoryExecutiveInsights({
      runs: [
        run({ id: "failed", status: "failed" }),
        run({ id: "canceled", status: "canceled" }),
        run({ id: "incomplete", status: "incomplete" }),
        run({ id: "completed", status: "completed" }),
      ],
    });
    const warning = insights.find(
      (insight) => insight.id === "completion-warning",
    );

    assert.ok(warning);
    assert.equal(warning!.severity, "warning");
    assert.equal(warning!.classification, "Derived");
  });

  it("labels recommendations as Derived", () => {
    const recommendations = buildAiFactoryExecutiveInsights({
      runs: [run({ id: "a", model: "model-a" }), run({ id: "b", model: "model-b" })],
    }).filter((insight) =>
      ["fastest-ttft", "highest-throughput", "most-reliable"].includes(
        insight.id,
      ),
    );

    assert.equal(recommendations.length > 0, true);
    assert.equal(
      recommendations.every((insight) => insight.classification === "Derived"),
      true,
    );
  });

  it("labels configured caveats as Configured", () => {
    const caveats = buildAiFactoryExecutiveInsights({ runs: [] }).filter(
      (insight) =>
        [
          "token-count-caveat",
          "gpu-snapshot-caveat",
          "compare-two-models",
        ].includes(insight.id),
    );

    assert.equal(caveats.length, 3);
    assert.equal(
      caveats.every((insight) => insight.classification === "Configured"),
      true,
    );
  });
});
