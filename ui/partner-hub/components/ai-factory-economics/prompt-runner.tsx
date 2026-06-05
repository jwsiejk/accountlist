"use client";

import { Play, RefreshCw, RotateCcw, Square, Terminal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withBasePath } from "@/lib/basePath";
import { createRunSummary } from "@/lib/ai-factory-economics/history";
import type {
  AiFactoryModelDiscoveryResult,
  AiFactoryRunMetrics,
  AiFactoryRunMetricsEventPayload,
  AiFactoryRunStatus,
  AiFactoryRunSummary,
  AiFactorySafeError,
} from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";
import { RunMetricsPanel } from "./run-metrics-panel";

const promptMaxLength = 4_000;

type SseEvent = {
  event: string;
  data: Record<string, unknown>;
};

function parseSseEvents(input: string): SseEvent[] {
  return input
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const eventLine = block
        .split("\n")
        .find((line) => line.startsWith("event:"));
      const dataLine = block
        .split("\n")
        .find((line) => line.startsWith("data:"));
      const event = eventLine?.replace(/^event:\s*/, "") || "message";
      const rawData = dataLine?.replace(/^data:\s*/, "") || "{}";

      try {
        return { event, data: JSON.parse(rawData) as Record<string, unknown> };
      } catch {
        return {
          event: "error",
          data: { message: "The local stream returned an unreadable event." },
        };
      }
    });
}

function formatRunError(error: unknown) {
  const safeError = error as Partial<AiFactorySafeError> | null;
  if (safeError?.message) {
    return safeError.detail
      ? `${safeError.message} ${safeError.detail}`
      : safeError.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The local prompt run failed.";
}

type PromptRunnerProps = {
  onRunSummary: (summary: AiFactoryRunSummary) => void;
};

export function PromptRunner({ onRunSummary }: PromptRunnerProps) {
  const [models, setModels] = useState<string[]>([]);
  const [modelDiscoveryError, setModelDiscoveryError] = useState("");
  const [model, setModel] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<AiFactoryRunStatus>("idle");
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<AiFactoryRunMetrics | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedModel =
    model === "__manual__" ? manualModel.trim() : model.trim();
  const canRun =
    status !== "running" &&
    selectedModel.length > 0 &&
    prompt.trim().length > 0;

  const loadModels = useCallback(async () => {
    setModelDiscoveryError("");

    try {
      const response = await fetch(
        withBasePath("/api/ai-factory-economics/models"),
        { cache: "no-store" },
      );
      const data = (await response.json()) as AiFactoryModelDiscoveryResult;
      if (data.ok && data.models.length > 0) {
        setModels(data.models);
        setModel((current) => current || data.models[0]);
        return;
      }

      setModels([]);
      setModel((current) => current || "__manual__");
      setModelDiscoveryError(
        data.ok
          ? "No local models were discovered. Enter a model manually after pulling it with Ollama."
          : data.error.message,
      );
    } catch {
      setModels([]);
      setModel((current) => current || "__manual__");
      setModelDiscoveryError(
        "Could not load local model discovery. Enter a local Ollama model manually.",
      );
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setError("");
    setOutput("");
    setMetrics(null);
    setPrompt("");
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("canceled");
    setError(
      "Prompt run canceled locally. Ollama may need a moment to stop the in-flight generation. No prompt or response content was persisted by the app.",
    );
  };

  const runPrompt = async () => {
    if (!selectedModel) {
      setStatus("failed");
      setError("Choose or enter a local Ollama model before running a prompt.");
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setStatus("failed");
      setError("Enter a prompt before running the local model.");
      return;
    }

    if (trimmedPrompt.length > promptMaxLength) {
      setStatus("failed");
      setError(
        `Prompts must be ${promptMaxLength.toLocaleString()} characters or fewer for Phase 8.`,
      );
      return;
    }

    const controller = new AbortController();
    const runStartedAt = new Date().toISOString();
    let latestMetrics: AiFactoryRunMetrics | null = null;
    let historyRecorded = false;
    const recordHistory = (
      runStatus: Exclude<AiFactoryRunStatus, "idle" | "running">,
      runMetrics: AiFactoryRunMetrics | null,
    ) => {
      if (historyRecorded) {
        return;
      }

      historyRecorded = true;
      onRunSummary(
        createRunSummary({
          startedAt: runStartedAt,
          completedAt: new Date().toISOString(),
          model: selectedModel,
          status: runStatus,
          metrics: runMetrics,
        }),
      );
    };

    abortRef.current = controller;
    setStatus("running");
    setError("");
    setOutput("");
    setMetrics(null);

    try {
      const response = await fetch(
        withBasePath("/api/ai-factory-economics/run"),
        {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: selectedModel, prompt: trimmedPrompt }),
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as {
          error?: AiFactorySafeError;
        } | null;
        throw new Error(formatRunError(data?.error));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const eventBlocks = buffer.split("\n\n");
        buffer = eventBlocks.pop() || "";

        for (const event of parseSseEvents(eventBlocks.join("\n\n"))) {
          if (event.event === "chunk") {
            setOutput(
              (current) =>
                `${current}${typeof event.data.response === "string" ? event.data.response : ""}`,
            );
          }

          if (event.event === "metrics") {
            latestMetrics = event.data as AiFactoryRunMetricsEventPayload;
            setMetrics(latestMetrics);
          }

          if (event.event === "done") {
            completed = true;
          }

          if (event.event === "error") {
            throw new Error(formatRunError(event.data));
          }
        }

        if (done) {
          if (buffer.trim()) {
            for (const event of parseSseEvents(buffer)) {
              if (event.event === "chunk") {
                setOutput(
                  (current) =>
                    `${current}${typeof event.data.response === "string" ? event.data.response : ""}`,
                );
              }
              if (event.event === "metrics") {
                latestMetrics = event.data as AiFactoryRunMetricsEventPayload;
                setMetrics(latestMetrics);
              }
              if (event.event === "done") {
                completed = true;
              }
              if (event.event === "error") {
                throw new Error(formatRunError(event.data));
              }
            }
          }
          break;
        }
      }

      if (completed) {
        setStatus("completed");
        recordHistory("completed", latestMetrics);
      } else {
        setStatus("incomplete");
        recordHistory("incomplete", latestMetrics);
        setError(
          "Local stream ended before Ollama sent a completion signal. The partial response remains visible, but this run should not be treated as complete.",
        );
      }
    } catch (runError) {
      if (controller.signal.aborted) {
        setStatus("canceled");
        recordHistory("canceled", latestMetrics);
        setError(
          "Prompt run canceled locally. No prompt or response content was persisted by the app.",
        );
      } else {
        setStatus("failed");
        recordHistory("failed", latestMetrics);
        setError(formatRunError(runError));
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
              Measured local runtime availability
            </p>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl">
              <Terminal className="h-5 w-5 text-primary" aria-hidden />
              Phase 8 prompt runner
            </CardTitle>
          </div>
          <MetricLabel classification="Measured" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm leading-relaxed text-foreground/70">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
          <p className="font-semibold">Phase 8 boundary</p>
          <p className="mt-1">
            This runner sends prompts only to local Ollama, streams the response
            into this browser session, measures server-side TTFT and latency,
            estimates token counts, derives tokens/sec, and records sanitized
            in-memory run summaries. GPU telemetry, watts, tokens/watt, and real
            cost/run are not exact per-run values in Phase 8. Prompt and
            response content are not persisted by the app or stored in history.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-foreground/60"
              htmlFor="ai-factory-model"
            >
              Local model
            </label>
            <select
              id="ai-factory-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              disabled={status === "running"}
            >
              {models.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="__manual__">Enter model manually…</option>
            </select>
            {model === "__manual__" ? (
              <input
                type="text"
                value={manualModel}
                onChange={(event) => setManualModel(event.target.value)}
                placeholder="llama3.2:3b"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                disabled={status === "running"}
              />
            ) : null}
            {modelDiscoveryError ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {modelDiscoveryError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void loadModels()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              disabled={status === "running"}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh models
            </button>
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-foreground/60"
              htmlFor="ai-factory-prompt"
            >
              Prompt
            </label>
            <textarea
              id="ai-factory-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask a short local inference question…"
              className="min-h-36 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              disabled={status === "running"}
              maxLength={promptMaxLength}
            />
            <p className="text-xs text-foreground/50">
              {prompt.length.toLocaleString()} /{" "}
              {promptMaxLength.toLocaleString()} characters. Content stays in
              request/browser memory only and is not saved by Partner Hub.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void runPrompt()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canRun}
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Run local prompt
          </button>
          {status === "running" ? (
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <Square className="h-3.5 w-3.5" aria-hidden />
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset / clear
          </button>
          <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground">
            Status: {status}
          </span>
        </div>

        {error ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
            {error}
          </p>
        ) : null}

        <RunMetricsPanel metrics={metrics} status={status} />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              Generated response
            </p>
            <MetricLabel classification="Measured" />
            <span className="text-xs text-foreground/50">
              Runtime response content only; Phase 8 history stores sanitized
              metrics/metadata without prompt or response content.
            </span>
          </div>
          <pre className="min-h-40 whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-4 text-sm text-foreground">
            {output || "Local Ollama response stream will appear here."}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
