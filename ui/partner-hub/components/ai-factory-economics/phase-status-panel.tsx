import { clsx } from "clsx";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PhaseStatus } from "@/lib/ai-factory-economics/types";

type PhaseStatusPanelProps = {
  phases: PhaseStatus[];
};

export function PhaseStatusPanel({ phases }: PhaseStatusPanelProps) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Phase status</p>
        <CardTitle className="text-xl">Roadmap checkpoint</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {phases.map((phase) => (
            <li
              key={phase.phase}
              className={clsx(
                "rounded-xl border p-4",
                phase.active ? "border-primary/30 bg-primary/10" : "border-border/60 bg-muted/30",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{phase.phase}: {phase.title}</p>
                <span
                  className={clsx(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                    phase.active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/70 bg-background/70 text-foreground/60",
                  )}
                >
                  {phase.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">{phase.description}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
