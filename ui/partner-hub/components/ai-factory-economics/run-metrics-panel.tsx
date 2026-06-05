import type { AiFactoryRunMetrics, AiFactoryRunStatus, MetricClassification } from "@/lib/ai-factory-economics/types";
import { formatDurationMs, formatTokenCount, formatTokensPerSecond } from "@/lib/ai-factory-economics/metrics";
import { MetricLabel } from "./metric-label";

type RunMetricsPanelProps = {
  metrics: AiFactoryRunMetrics | null;
  status: AiFactoryRunStatus;
};

type DisplayMetric = {
  label: string;
  value: string;
  classification: MetricClassification;
  help: string;
};

function placeholderMetrics(status: AiFactoryRunStatus): DisplayMetric[] {
  return [
    {
      label: "TTFT",
      value: "Pending",
      classification: "Measured",
      help: status === "running" ? "Waiting for the first server-side Ollama response chunk." : "Run a local prompt to measure first response chunk timing.",
    },
    {
      label: "Total latency",
      value: "Pending",
      classification: "Measured",
      help: "Available after Ollama sends a done event.",
    },
    {
      label: "Prompt tokens",
      value: "Pending",
      classification: "Estimated",
      help: "Estimated locally with a rough characters-per-token approximation.",
    },
    {
      label: "Response tokens",
      value: "Pending",
      classification: "Estimated",
      help: "Estimated from transient response text for the active run only.",
    },
    {
      label: "Tokens/sec",
      value: "Pending",
      classification: "Derived",
      help: "Derived from estimated response tokens and measured generation duration.",
    },
  ];
}

function displayMetrics(metrics: AiFactoryRunMetrics | null, status: AiFactoryRunStatus): DisplayMetric[] {
  if (!metrics) {
    return placeholderMetrics(status);
  }

  return [
    {
      label: "TTFT",
      value: formatDurationMs(metrics.ttftMs),
      classification: metrics.classifications.ttft,
      help: "Measured server-side from request start to the first streamed Ollama response chunk.",
    },
    {
      label: "Total latency",
      value: formatDurationMs(metrics.totalLatencyMs),
      classification: metrics.classifications.totalLatency,
      help: "Measured server-side from request start to Ollama's done event when available.",
    },
    {
      label: "Prompt tokens",
      value: formatTokenCount(metrics.estimatedPromptTokens),
      classification: metrics.classifications.promptTokens,
      help: "Estimated; Phase 8 does not add an exact tokenizer dependency.",
    },
    {
      label: "Response tokens",
      value: formatTokenCount(metrics.estimatedResponseTokens),
      classification: metrics.classifications.responseTokens,
      help: "Estimated from active in-memory response text only; response content is not persisted.",
    },
    {
      label: "Tokens/sec",
      value: formatTokensPerSecond(metrics.estimatedTokensPerSecond),
      classification: metrics.classifications.tokensPerSecond,
      help: "Derived from estimated response tokens divided by measured generation duration.",
    },
  ];
}

export function RunMetricsPanel({ metrics, status }: RunMetricsPanelProps) {
  const items = displayMetrics(metrics, status);
  const generationDuration = metrics ? formatDurationMs(metrics.generationDurationMs) : "Pending";

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Phase 8 local run metrics</p>
          <p className="mt-1 text-xs text-foreground/55">
            Local-only Ollama timing is measured on the server. Token counts are estimates; throughput is derived.
          </p>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
          Completion status: {metrics?.status ?? status}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border/60 bg-background p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{item.label}</p>
              <MetricLabel classification={item.classification} />
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
            <p className="mt-1 text-xs text-foreground/55">{item.help}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Generation duration</p>
            <MetricLabel classification="Measured" />
          </div>
          <p className="mt-2 font-semibold text-foreground">{generationDuration}</p>
          <p className="mt-1 text-xs text-foreground/55">Measured from first response chunk to done when a done event is received.</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
          <p className="text-xs font-semibold uppercase tracking-wide">Telemetry boundary</p>
          <p className="mt-1 text-xs">
            GPU telemetry is displayed as a separate snapshot panel in Phase 8; tokens/watt and real cost/run remain unavailable for live runs.
          </p>
        </div>
      </div>

      {metrics?.note ? <p className="text-xs text-foreground/55">{metrics.note}</p> : null}
    </div>
  );
}
