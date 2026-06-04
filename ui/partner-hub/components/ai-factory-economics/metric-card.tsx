import { clsx } from "clsx";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiFactoryMetric } from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";

const toneClasses: Record<NonNullable<AiFactoryMetric["tone"]>, string> = {
  default: "from-muted/60 to-card",
  good: "from-emerald-500/10 to-card",
  warning: "from-amber-500/10 to-card",
  info: "from-primary/10 to-card",
};

type MetricCardProps = {
  metric: AiFactoryMetric;
};

export function MetricCard({ metric }: MetricCardProps) {
  const tone = metric.tone ?? "default";

  return (
    <Card className={clsx("border-border/70 bg-gradient-to-br", toneClasses[tone])}>
      <CardHeader className="mb-3 flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-sm font-semibold text-foreground/80">{metric.label}</CardTitle>
        <MetricLabel classification={metric.classification} />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{metric.value}</p>
        <p className="text-xs leading-relaxed text-foreground/60">{metric.description}</p>
      </CardContent>
    </Card>
  );
}
