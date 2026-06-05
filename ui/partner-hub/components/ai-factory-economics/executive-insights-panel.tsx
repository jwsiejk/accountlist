import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildAiFactoryExecutiveInsights,
  buildAiFactoryExecutiveScorecards,
} from "@/lib/ai-factory-economics/insights";
import type {
  AiFactoryExecutiveInsight,
  AiFactoryRunSummary,
} from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";

type ExecutiveInsightsPanelProps = {
  runs: AiFactoryRunSummary[];
};

function insightTone(insight: AiFactoryExecutiveInsight): string {
  if (insight.severity === "good") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (insight.severity === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  }

  return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

function InsightIcon({ insight }: { insight: AiFactoryExecutiveInsight }) {
  if (insight.severity === "good") {
    return <CheckCircle2 className="h-4 w-4" aria-hidden />;
  }

  if (insight.severity === "warning") {
    return <AlertTriangle className="h-4 w-4" aria-hidden />;
  }

  return <Info className="h-4 w-4" aria-hidden />;
}

export function ExecutiveInsightsPanel({ runs }: ExecutiveInsightsPanelProps) {
  const scorecards = buildAiFactoryExecutiveScorecards({ runs });
  const insights = buildAiFactoryExecutiveInsights({ runs });
  const derivedRecommendations = insights.filter(
    (insight) => insight.classification === "Derived",
  );
  const configuredCaveats = insights.filter(
    (insight) => insight.classification === "Configured",
  );

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
              Executive view · Phase 8
            </p>
            <CardTitle className="mt-1 flex items-center gap-2 text-2xl">
              <Lightbulb className="h-6 w-6 text-primary" aria-hidden />
              AI Factory Efficiency insights
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <MetricLabel classification="Derived" />
            <MetricLabel classification="Configured" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed text-foreground/70">
        <div className="rounded-2xl border border-border bg-background/80 p-4">
          <p className="font-semibold text-foreground">
            What this local demo is proving
          </p>
          <p className="mt-2">
            Partner Hub can run local Ollama prompts, capture measured runtime
            responsiveness, estimate token volume, derive model comparison
            summaries, and present safe recommendations without storing prompt
            or response content. The recommendations below are based only on
            current browser-memory summaries from this workstation.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {scorecards.map((scorecard) => (
            <div
              key={scorecard.id}
              className="rounded-2xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                  {scorecard.title}
                </p>
                <MetricLabel
                  classification={scorecard.classification}
                  className="px-2 py-0.5 text-[10px]"
                />
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {scorecard.value}
              </p>
              {scorecard.supportingMetric ? (
                <p className="mt-1 text-xs font-medium text-primary">
                  {scorecard.supportingMetric}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-foreground/55">
                {scorecard.detail}
              </p>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Safe recommendations
            </h2>
            <MetricLabel classification="Derived" />
          </div>
          {derivedRecommendations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background/70 p-4">
              Run local prompts to generate Derived recommendations. Until then,
              only Configured demo caveats and setup guidance are shown.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {derivedRecommendations.map((insight) => (
                <article
                  key={insight.id}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <span
                        className={`inline-flex rounded-full border p-1 ${insightTone(
                          insight,
                        )}`}
                      >
                        <InsightIcon insight={insight} />
                      </span>
                      {insight.title}
                    </div>
                    <MetricLabel
                      classification={insight.classification}
                      className="px-2 py-0.5 text-[10px]"
                    />
                  </div>
                  <p className="mt-3">{insight.explanation}</p>
                  {insight.supportingMetric ? (
                    <p className="mt-2 text-xs font-semibold text-primary">
                      Supporting metric: {insight.supportingMetric}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-foreground/55">
                    {insight.caveat}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-border bg-background/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-foreground">
              Required caveats for demo narration
            </h2>
            <MetricLabel classification="Configured" />
          </div>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {configuredCaveats.map((insight) => (
              <li key={insight.id} className="flex gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>
                  <span className="font-semibold text-foreground">
                    {insight.title}:
                  </span>{" "}
                  {insight.explanation} {insight.caveat}
                </span>
              </li>
            ))}
            <li className="flex gap-2">
              <span className="mt-0.5 text-primary">•</span>
              <span>
                <span className="font-semibold text-foreground">
                  Local-only scope:
                </span>{" "}
                No production benchmark claims, no persisted prompt/response
                content, no backend storage, and no database persistence are
                part of this Phase 8 panel.
              </span>
            </li>
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
