import { Cpu, Gauge, ShieldCheck, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiFactoryEconomicsMockDashboard } from "@/lib/ai-factory-economics/mock-data";
import { ExecutiveSummaryCards } from "./executive-summary-cards";
import { GpuTelemetryPanel } from "./gpu-telemetry-panel";
import { MetricCard } from "./metric-card";
import { ModelDiscoveryPanel } from "./model-discovery-panel";
import { OllamaStatusCard } from "./ollama-status-card";
import { PhaseStatusPanel } from "./phase-status-panel";
import { PromptRunner } from "./prompt-runner";
import { ReadinessPanel } from "./readiness-panel";

export function AiFactoryEconomicsTool() {
  const dashboard = aiFactoryEconomicsMockDashboard;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/80 p-8 text-white shadow-sm md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_28rem)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Local-only Phase 5
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">AI Factory Economics</h1>
              <p className="max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">{dashboard.summary}</p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <ShieldCheck className="mb-3 h-5 w-5 text-emerald-200" aria-hidden />
                <p className="font-semibold">No cloud required</p>
                <p className="mt-1 text-white/65">Designed as a local Partner Hub education module.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <Gauge className="mb-3 h-5 w-5 text-blue-200" aria-hidden />
                <p className="font-semibold">Demo metrics remain</p>
                <p className="mt-1 text-white/65">Dashboard economics remain demo/mock while prompt streaming and GPU snapshots are measured locally.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <Cpu className="mb-3 h-5 w-5 text-amber-200" aria-hidden />
                <p className="font-semibold">Prompt runs locally</p>
                <p className="mt-1 text-white/65">Prompt streaming is live/local; TTFT, latency, and NVIDIA snapshots are measured, tokens are estimated, and tokens/sec is derived.</p>
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
              <p>This is a local demo module. No cloud services, accounts, secrets, or external APIs are required.</p>
              <p>Phase 5 adds local NVIDIA nvidia-smi snapshots for GPU utilization, memory, watts, and temperature. Demo/mock dashboard economics remain visible; telemetry is optional and is not exact per-run attribution.</p>
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

      <section className="grid gap-4 lg:grid-cols-2">
        <OllamaStatusCard />
        <ModelDiscoveryPanel />
      </section>

      <GpuTelemetryPanel />

      <PromptRunner />

      <section className="grid gap-4 lg:grid-cols-2">
        <ReadinessPanel items={dashboard.readiness} />
        <PhaseStatusPanel phases={dashboard.phases} />
      </section>
    </div>
  );
}
