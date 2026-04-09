import { InfoTooltip } from "@/components/hpc-lab/info-tooltip";
import { getHpcLabConcept } from "@/lib/hpc-lab/concepts";
import type { HpcLabGuidedWalkthrough } from "@/lib/hpc-lab/types";
import { formatCount, formatPercent } from "@/lib/hpc-lab/format";

type GuidedWalkthroughProps = {
  walkthrough: HpcLabGuidedWalkthrough | null;
  stale: boolean;
};

const renderEvidenceValue = (value: number, format: "count" | "percent") => {
  if (format === "count") {
    return formatCount(value);
  }
  return formatPercent(value);
};

export function GuidedWalkthrough({ walkthrough, stale }: GuidedWalkthroughProps) {
  const metadataPath = getHpcLabConcept("metadata-path");
  const sharedFilesystem = getHpcLabConcept("shared-filesystem");
  const localScratch = getHpcLabConcept("local-scratch");
  const stripedDataPath = getHpcLabConcept("striped-data-path");
  const computeClients = getHpcLabConcept("compute-clients");

  if (!walkthrough) {
    return <p className="text-sm text-foreground/70">Run a simulation to generate the guided walkthrough.</p>;
  }

  return (
    <section className="space-y-4" aria-label="Guided walkthrough">
      {stale ? (
        <p className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700">Walkthrough reflects the last run and is currently stale.</p>
      ) : null}

      <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2">
        <p className="text-sm font-medium text-foreground">{walkthrough.headline}</p>
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">What happened</h3>
        <p className="text-sm text-foreground/80">{walkthrough.whatHappened}</p>
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Why</h3>
        <p className="text-sm text-foreground/80">{walkthrough.whyItHappened}</p>
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">What to learn</h3>
        <p className="text-sm text-foreground/80">{walkthrough.whatToLearn}</p>
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Environment context</h3>
        <p className="text-sm text-foreground/80">{walkthrough.environmentContext}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/70">
          <span className="inline-flex items-center gap-1">
            <span>metadata path</span>
            <InfoTooltip label="Metadata path concept" title={metadataPath.hoverTitle} body={metadataPath.explanation} />
          </span>
          <span className="inline-flex items-center gap-1">
            <span>shared filesystem</span>
            <InfoTooltip label="Shared filesystem concept" title={sharedFilesystem.hoverTitle} body={sharedFilesystem.explanation} />
          </span>
          <span className="inline-flex items-center gap-1">
            <span>striped data path</span>
            <InfoTooltip label="Striped data path concept" title={stripedDataPath.hoverTitle} body={stripedDataPath.explanation} />
          </span>
          <span className="inline-flex items-center gap-1">
            <span>compute clients</span>
            <InfoTooltip label="Compute clients concept" title={computeClients.hoverTitle} body={computeClients.explanation} />
          </span>
          <span className="inline-flex items-center gap-1">
            <span>local scratch</span>
            <InfoTooltip label="Local scratch concept" title={localScratch.hoverTitle} body={localScratch.whyItMatters} />
          </span>
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Try next</h3>
        <ul className="space-y-2">
          {walkthrough.nextExperiments.map((experiment) => (
            <li key={experiment.change} className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground/80">
              <p className="font-medium text-foreground">{experiment.title}</p>
              <p className="mt-1">{experiment.change}</p>
              <p className="mt-1 text-xs text-foreground/70">{experiment.reason}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Evidence</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {walkthrough.evidence.map((item) => (
            <li key={item.metric} className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground/80">
              <p className="font-medium text-foreground">
                {item.label}: <span>{renderEvidenceValue(item.value, item.format)}</span>
              </p>
              <p className="mt-1 text-xs text-foreground/70">{item.interpretation}</p>
            </li>
          ))}
        </ul>
      </div>

      {walkthrough.runCaveats.length > 0 ? (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Run caveats</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-foreground/75">
            {walkthrough.runCaveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
