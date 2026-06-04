import type { AiFactoryMetric } from "@/lib/ai-factory-economics/types";
import { MetricCard } from "./metric-card";

type ExecutiveSummaryCardsProps = {
  metrics: AiFactoryMetric[];
};

export function ExecutiveSummaryCards({ metrics }: ExecutiveSummaryCardsProps) {
  return (
    <section className="space-y-4" aria-labelledby="ai-factory-metrics-heading">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Mock economics dashboard</p>
        <h2 id="ai-factory-metrics-heading" className="text-2xl font-semibold tracking-tight text-foreground">
          Phase 1 metric preview
        </h2>
        <p className="max-w-3xl text-sm text-foreground/70">
          These cards are deliberately static. Each metric carries a visible classification so future measured, estimated,
          derived, configured, and demo values can be compared honestly.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}
