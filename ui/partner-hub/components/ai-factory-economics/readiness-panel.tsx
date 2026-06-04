import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReadinessItem } from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";

type ReadinessPanelProps = {
  items: ReadinessItem[];
};

export function ReadinessPanel({ items }: ReadinessPanelProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Setup readiness</p>
        <CardTitle className="text-xl">Local service plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">{item.status}</p>
              </div>
              <MetricLabel classification={item.classification} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">{item.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
