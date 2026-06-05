"use client";

import { useState } from "react";
import { Cpu, Gauge, ShieldCheck, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addRunToHistory } from "@/lib/ai-factory-economics/history";
import { aiFactoryEconomicsMockDashboard } from "@/lib/ai-factory-economics/mock-data";
import type { AiFactoryRunSummary } from "@/lib/ai-factory-economics/types";
import { ExecutiveInsightsPanel } from "./executive-insights-panel";
import { ExecutiveSummaryCards } from "./executive-summary-cards";
import { GpuTelemetryPanel } from "./gpu-telemetry-panel";
import { MetricCard } from "./metric-card";
import { ModelComparisonTable } from "./model-comparison-table";
import { ModelDiscoveryPanel } from "./model-discovery-panel";
import { OllamaStatusCard } from "./ollama-status-card";
import { PhaseStatusPanel } from "./phase-status-panel";
import { PromptRunner } from "./prompt-runner";
import { ReadinessPanel } from "./readiness-panel";
import { RunHistoryPanel } from "./run-history-panel";

export function AiFactoryEconomicsTool() {
  const dashboard = aiFactoryEconomicsMockDashboard;
  const [runHistory, setRunHistory] = useState<AiFactoryRunSummary[]>([]);

  const recordRunSummary = (summary: AiFactoryRunSummary) => {
    setRunHistory((current) => addRunToHistory(current, summary));
  };

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/80 p-8 text-white shadow-sm md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_28rem)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Local-only Phase 8
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                AI Factory Economics
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
                Phase 8 turns the local AI Factory demo into an executive-ready
                view: measured local runtime, estimated token counts, derived
                model comparison/recommendations, and no persisted prompt or
                response content.
              </p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <ShieldCheck
                  className="mb-3 h-5 w-5 text-emerald-200"
                  aria-hidden
                />
                <p className="font-semibold">No cloud required</p>
                <p className="mt-1 text-white/65">
                  Designed as a local Partner Hub education module.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <Gauge className="mb-3 h-5 w-5 text-blue-200" aria-hidden />
                <p className="font-semibold">Measured, estimated, derived</p>
                <p className="mt-1 text-white/65">
                  Prompt runs measure TTFT/latency, estimate tokens, derive
                  tokens/sec and recommendations, and keep demo/mock economics
                  clearly labeled.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <Cpu className="mb-3 h-5 w-5 text-amber-200" aria-hidden />
                <p className="font-semibold">Content stays local</p>
                <p className="mt-1 text-white/65">
                  Prompt and response text are active-session only. In-memory
                  summaries exclude content and disappear on reload.
                </p>
              </div>
            </div>
          </div>
          <Card className="border-white/15 bg-white/10 text-white shadow-lg backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Zap className="h-5 w-5 text-amber-200" aria-hidden />
                Local-only notice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-white/75">
              <p>
                This is a local demo module. No cloud services, accounts,
                secrets, or external APIs are required.
              </p>
              <p>
                Phase 8 adds executive scorecards and safe Derived
                recommendations from current in-memory summaries. Demo/mock
                economics remain visible; GPU telemetry is optional snapshot
                data and is not exact per-run attribution.
              </p>
            </CardContent>
          </Card>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {dashboard.assumptions.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <ExecutiveSummaryCards metrics={dashboard.metrics} />

      <ExecutiveInsightsPanel runs={runHistory} />

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            Local readiness
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Ollama, local models, and GPU snapshot
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <OllamaStatusCard />
          <ModelDiscoveryPanel />
        </div>
        <GpuTelemetryPanel />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            Run a prompt
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Measured runtime and estimated tokens
          </h2>
        </div>
        <PromptRunner onRunSummary={recordRunSummary} />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
            Learn from runs
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Browser-memory history and Derived comparison
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <RunHistoryPanel
            runs={runHistory}
            onClearHistory={() => setRunHistory([])}
          />
          <ModelComparisonTable runs={runHistory} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ReadinessPanel items={dashboard.readiness} />
        <PhaseStatusPanel phases={dashboard.phases} />
      </section>
    </div>
  );
}
