import { Clock, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDurationMs,
  formatTokenCount,
  formatTokensPerSecond,
} from "@/lib/ai-factory-economics/metrics";
import type { AiFactoryRunSummary } from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";

type RunHistoryPanelProps = {
  runs: AiFactoryRunSummary[];
  onClearHistory: () => void;
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function RunHistoryPanel({
  runs,
  onClearHistory,
}: RunHistoryPanelProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
              Browser-memory summaries
            </p>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl">
              <Clock className="h-5 w-5 text-primary" aria-hidden />
              Recent run history
            </CardTitle>
          </div>
          <MetricLabel classification="Measured" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/70">
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs">
          <p className="font-semibold text-foreground">
            Prompt and response content are not stored.
          </p>
          <p className="mt-1">
            Phase 8 stores sanitized run summaries in React/browser memory only.
            History disappears on page reload and never uses localStorage, a
            database, or backend storage.
          </p>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            Run several local prompts to populate in-memory sanitized history.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-xs">
              <thead className="bg-muted/40 text-foreground/60">
                <tr>
                  <th className="px-3 py-2 font-semibold">Time</th>
                  <th className="px-3 py-2 font-semibold">Model</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">TTFT</th>
                  <th className="px-3 py-2 font-semibold">Total latency</th>
                  <th className="px-3 py-2 font-semibold">Tokens/sec</th>
                  <th className="px-3 py-2 font-semibold">Response tokens</th>
                  <th className="px-3 py-2 font-semibold">Labels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatTimestamp(run.completedAt || run.startedAt)}
                    </td>
                    <td className="px-3 py-3 align-top font-medium text-foreground">
                      {run.model}
                    </td>
                    <td className="px-3 py-3 align-top capitalize text-foreground/70">
                      {run.status}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatDurationMs(run.ttftMs)}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatDurationMs(run.totalLatencyMs)}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatTokensPerSecond(run.estimatedTokensPerSecond)}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatTokenCount(run.estimatedResponseTokens)}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        <MetricLabel
                          classification={run.classifications.ttft}
                          className="px-2 py-0.5 text-[10px]"
                        />
                        <MetricLabel
                          classification={run.classifications.responseTokens}
                          className="px-2 py-0.5 text-[10px]"
                        />
                        <MetricLabel
                          classification={run.classifications.tokensPerSecond}
                          className="px-2 py-0.5 text-[10px]"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={onClearHistory}
          disabled={runs.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Clear in-memory history
        </button>
      </CardContent>
    </Card>
  );
}
