import {
  buildEnvironmentResultContext,
  getArchitectureModeLabel,
  getHpcLabEnvironmentProfile,
} from "@/lib/hpc-lab/environment";
import type { HpcLabRunBottleneckAttribution } from "@/lib/hpc-lab/types";

type EnvironmentExplainerProps = {
  bottleneckAttribution: HpcLabRunBottleneckAttribution | null;
};

export function EnvironmentExplainer({ bottleneckAttribution }: EnvironmentExplainerProps) {
  const profile = getHpcLabEnvironmentProfile();
  const storageTiers = profile.tiers.filter((tier) => tier.id !== "archive-storage");
  const simulatedLayers = profile.stackLayers.filter((layer) => layer.simulatedToday);
  const conceptualLayers = profile.stackLayers.filter((layer) => !layer.simulatedToday);

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4" aria-label="HPC environment explainer">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">What environment this lab represents</h2>
        <p className="text-sm text-foreground/75">{profile.title}: {profile.shortDescription}</p>
        <p className="text-xs text-foreground/70">
          Architecture mode: <span className="font-medium text-foreground">{getArchitectureModeLabel(profile.architectureMode)}</span>. {profile.architectureModePositioning}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Storage tiers</h3>
        <ul className="grid gap-2 md:grid-cols-3">
          {storageTiers.map((tier) => (
            <li key={tier.id} className="rounded-md border border-border/70 bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">{tier.title}</p>
              <p className="mt-1 text-xs text-foreground/75">{tier.summary}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">How the stack fits together</h3>
        <p className="text-xs text-foreground/75">
          Login/access and scheduler layers place work on compute clients. Compute nodes use local scratch per node, while shared work flows through the
          parallel filesystem metadata path and striped data path. Longer-lived home/lab/project storage sits outside active shared scratch.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded-md border border-border/70 bg-muted/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">What this simulator models today</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-foreground/75">
            {profile.whatTheSimulatorModels.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-xs text-foreground/70">
            Modeled stack layers: {simulatedLayers.map((layer) => layer.title).join("; ")}.
          </p>
        </div>

        <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">What is conceptual but not separately simulated yet</h3>
          <ul className="list-disc space-y-1 pl-4 text-xs text-foreground/75">
            {profile.whatTheSimulatorDoesNotModel.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-xs text-foreground/70">
            Conceptual-only layers: {conceptualLayers.map((layer) => layer.title).join("; ")}.
          </p>
        </div>
      </div>

      {bottleneckAttribution ? (
        <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-foreground/80">
          {buildEnvironmentResultContext(bottleneckAttribution)}
        </p>
      ) : null}
    </section>
  );
}
