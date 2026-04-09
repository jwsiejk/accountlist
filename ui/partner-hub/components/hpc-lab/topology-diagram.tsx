import { InfoTooltip } from "@/components/hpc-lab/info-tooltip";
import { getHpcLabConcept } from "@/lib/hpc-lab/concepts";
import type { HpcLabTopologyModel } from "@/lib/hpc-lab/types";

const Box = ({ title, value, conceptId }: { title: string; value: string; conceptId: Parameters<typeof getHpcLabConcept>[0] }) => {
  const concept = getHpcLabConcept(conceptId);
  return (
  <div className="rounded border border-border/70 bg-muted/30 p-2 text-center">
    <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-foreground/60">
      <span>{title}</span>
      <InfoTooltip label={`${title} explanation`} title={concept.hoverTitle} body={`${concept.explanation} ${concept.realWorldMapping}`} />
    </p>
    <p className="break-words text-sm font-medium text-foreground">{value}</p>
  </div>
);
};

export function TopologyDiagram({ model }: { model: HpcLabTopologyModel }) {
  const networkConcept = getHpcLabConcept("network-fabric");
  const totalOstsConcept = getHpcLabConcept("total-osts");
  const stripeConcept = getHpcLabConcept("effective-stripe-width");
  const localScratchConcept = getHpcLabConcept("local-scratch");
  const sharedScratchConcept = getHpcLabConcept("shared-scratch");
  const longLivedConcept = getHpcLabConcept("long-lived-storage");

  return (
    <div className="space-y-3" role="group" aria-label="Cluster topology summary">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Box title="CPU pool" value={`${model.cpuNodes} nodes`} conceptId="cpu-pool" />
        <Box title="GPU pool" value={`${model.gpuNodes} nodes`} conceptId="gpu-pool" />
      </div>

      <div className="rounded border border-border/70 bg-card px-3 py-2 text-center text-xs text-foreground/70">
        <span className="inline-flex items-center gap-1">
          <span>Network fabric · {model.networkBandwidthGbps} Gbps</span>
          <InfoTooltip
            label="Network fabric explanation"
            title={networkConcept.hoverTitle}
            body={`${networkConcept.explanation} ${networkConcept.realWorldMapping}`}
          />
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Box title="MDS / metadata" value={`${model.metadataLatencyMs} ms`} conceptId="mds-metadata" />
        <Box title="OSS pool" value={`${model.ossCount} OSS`} conceptId="oss-pool" />
      </div>

      <div className="rounded border border-border/70 bg-muted/20 p-2 text-xs text-foreground/75">
        <p className="inline-flex items-center gap-1">
          <span>
            Total OSTs: <span className="font-medium text-foreground">{model.totalOsts}</span>
          </span>
          <InfoTooltip
            label="Total OSTs explanation"
            title={totalOstsConcept.hoverTitle}
            body={`${totalOstsConcept.explanation} ${totalOstsConcept.realWorldMapping}`}
          />
        </p>
        <p className="inline-flex items-center gap-1">
          <span>
            Effective stripe width: <span className="font-medium text-foreground">{model.effectiveStripeWidth}</span>
          </span>
          <InfoTooltip
            label="Effective stripe width explanation"
            title={stripeConcept.hoverTitle}
            body={`${stripeConcept.explanation} ${stripeConcept.whyItMatters}`}
          />
        </p>
      </div>

      <div className="rounded border border-border/70 bg-muted/20 p-2 text-xs text-foreground/75">
        <p className="break-words">
          Topology note: compute nodes may use{" "}
          <span className="inline-flex items-center gap-1">
            <span>local scratch</span>
            <InfoTooltip
              label="Local scratch explanation"
              title={localScratchConcept.hoverTitle}
              body={`${localScratchConcept.explanation} ${localScratchConcept.whyItMatters}`}
            />
          </span>{" "}
          in real clusters, but this simulator primarily models the{" "}
          <span className="inline-flex items-center gap-1">
            <span>shared storage side</span>
            <InfoTooltip
              label="Shared scratch explanation"
              title={sharedScratchConcept.hoverTitle}
              body={`${sharedScratchConcept.explanation} ${sharedScratchConcept.whyItMatters}`}
            />
          </span>{" "}
          (metadata + striped shared data path + network).{" "}
          <span className="inline-flex items-center gap-1">
            <span>Local scratch and longer-lived storage</span>
            <InfoTooltip
              label="Long-lived storage explanation"
              title={longLivedConcept.hoverTitle}
              body={`${longLivedConcept.explanation} ${longLivedConcept.whyItMatters}`}
            />
          </span>{" "}
          remain conceptual teaching elements unless separately modeled.
        </p>
      </div>
    </div>
  );
}
