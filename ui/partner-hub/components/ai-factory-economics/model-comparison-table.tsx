import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateModelComparisons } from "@/lib/ai-factory-economics/history";
import {
  formatDurationMs,
  formatTokensPerSecond,
} from "@/lib/ai-factory-economics/metrics";
import type { AiFactoryRunSummary } from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";

type ModelComparisonTableProps = {
  runs: AiFactoryRunSummary[];
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

export function ModelComparisonTable({ runs }: ModelComparisonTableProps) {
  const comparisons = aggregateModelComparisons(runs);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
              Derived from sanitized history
            </p>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden />
              Model comparison
            </CardTitle>
          </div>
          <MetricLabel classification="Derived" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/70">
        <p>
          Aggregates are <strong>Derived</strong> from recent in-memory
          summaries. Missing metrics are excluded from averages and are never
          substituted with zero.
        </p>

        {comparisons.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            Run history is empty, so no model comparison is available yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-left text-xs">
              <thead className="bg-muted/40 text-foreground/60">
                <tr>
                  <th className="px-3 py-2 font-semibold">Model</th>
                  <th className="px-3 py-2 font-semibold">Runs</th>
                  <th className="px-3 py-2 font-semibold">Completed</th>
                  <th className="px-3 py-2 font-semibold">
                    Failed / canceled / incomplete
                  </th>
                  <th className="px-3 py-2 font-semibold">Avg TTFT</th>
                  <th className="px-3 py-2 font-semibold">Avg total latency</th>
                  <th className="px-3 py-2 font-semibold">Avg tokens/sec</th>
                  <th className="px-3 py-2 font-semibold">Best tokens/sec</th>
                  <th className="px-3 py-2 font-semibold">Fastest TTFT</th>
                  <th className="px-3 py-2 font-semibold">Most recent</th>
                  <th className="px-3 py-2 font-semibold">Label</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {comparisons.map((comparison) => (
                  <tr key={comparison.model}>
                    <td className="px-3 py-3 align-top font-medium text-foreground">
                      {comparison.model}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {comparison.runCount}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {comparison.completedCount}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {comparison.failedCount} / {comparison.canceledCount} /{" "}
                      {comparison.incompleteCount}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatDurationMs(comparison.averageTtftMs)}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatDurationMs(comparison.averageTotalLatencyMs)}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatTokensPerSecond(
                        comparison.averageEstimatedTokensPerSecond,
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatTokensPerSecond(
                        comparison.bestEstimatedTokensPerSecond,
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatDurationMs(comparison.fastestTtftMs)}
                    </td>
                    <td className="px-3 py-3 align-top text-foreground/70">
                      {formatTimestamp(comparison.mostRecentRunAt)}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <MetricLabel
                        classification={comparison.classification}
                        className="px-2 py-0.5 text-[10px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
