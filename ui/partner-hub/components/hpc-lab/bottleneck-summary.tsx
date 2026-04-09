import type { HpcLabBottleneckKind, HpcLabRunBottleneckAttribution } from "@/lib/hpc-lab/types";

type BottleneckSummaryProps = {
  attribution: HpcLabRunBottleneckAttribution | null;
  stale: boolean;
};

const kindLabel: Record<HpcLabBottleneckKind, string> = {
  compute: "Mostly compute-bound",
  storage: "Mostly storage-bound",
  metadata: "Mostly metadata-bound",
  network: "Mostly network-bound",
  mixed: "Mixed bottlenecks",
  balanced: "No strong bottleneck detected",
};

const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function BottleneckSummary({ attribution, stale }: BottleneckSummaryProps) {
  if (!attribution) {
    return <p className="text-sm text-foreground/70">Run a simulation to generate bottleneck attribution and derived run metrics.</p>;
  }

  return (
    <section className="space-y-3" aria-label="Run-level bottleneck summary">
      {stale ? (
        <p className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700">Attribution reflects the last run and is currently stale.</p>
      ) : null}

      <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground/85">
        <p className="font-medium text-foreground">{kindLabel[attribution.dominantKind]}</p>
        <p className="text-xs text-foreground/70">
          Confidence: <span className="font-medium text-foreground">{attribution.confidence}</span> ({formatPercent(attribution.confidenceScore)}) · Dominant
          time share: <span className="font-medium text-foreground">{formatPercent(attribution.dominantTimeShare)}</span>
        </p>
        <p className="mt-1 text-xs text-foreground/75">{attribution.explanation}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Next levers</p>
        <ul className="list-disc space-y-1 pl-4 text-xs text-foreground/80">
          {attribution.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <div className="grid gap-1 text-xs text-foreground/80 sm:grid-cols-2">
        <p>
          Throughput fulfillment: <span className="font-medium text-foreground">{formatPercent(attribution.derivedMetrics.throughputFulfillmentRatio)}</span>
        </p>
        <p>
          Metadata service ratio: <span className="font-medium text-foreground">{formatPercent(attribution.derivedMetrics.metadataServiceRatio)}</span>
        </p>
        <p>
          Queue burden ratio: <span className="font-medium text-foreground">{formatPercent(attribution.derivedMetrics.queueBurdenRatio)}</span>
        </p>
        <p>
          Checkpoint-active tick share: <span className="font-medium text-foreground">{formatPercent(attribution.derivedMetrics.checkpointActiveTickShare)}</span>
        </p>
        <p>
          Bottleneck transitions: <span className="font-medium text-foreground">{attribution.derivedMetrics.bottleneckTransitionCount}</span>
        </p>
        <p>
          Longest dominant streak: <span className="font-medium text-foreground">{attribution.derivedMetrics.longestDominantStreak}</span>
        </p>
      </div>
    </section>
  );
}
