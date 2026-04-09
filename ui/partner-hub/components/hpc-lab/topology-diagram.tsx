import { ConceptHelp } from "@/components/hpc-lab/concept-help";
import type { HpcLabTopologyModel } from "@/lib/hpc-lab/types";

const Box = ({ title, value, conceptId }: { title: string; value: string; conceptId: "cpu-pool" | "gpu-pool" | "mds-metadata" | "oss-pool" }) => (
  <div className="rounded border border-border/70 bg-muted/30 p-2 text-center">
    <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-foreground/60">
      <span>{title}</span>
      <ConceptHelp conceptId={conceptId} label={`${title} explanation`} />
    </p>
    <p className="break-words text-sm font-medium text-foreground">{value}</p>
  </div>
);

export function TopologyDiagram({ model }: { model: HpcLabTopologyModel }) {
  return (
    <div className="space-y-3" role="group" aria-label="Cluster topology summary">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Box title="CPU pool" value={`${model.cpuNodes} nodes`} conceptId="cpu-pool" />
        <Box title="GPU pool" value={`${model.gpuNodes} nodes`} conceptId="gpu-pool" />
      </div>

      <div className="rounded border border-border/70 bg-card px-3 py-2 text-center text-xs text-foreground/70">
        <span className="inline-flex items-center gap-1">
          <span>Network fabric · {model.networkBandwidthGbps} Gbps</span>
          <ConceptHelp conceptId="network-fabric" label="Network fabric explanation" />
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
          <ConceptHelp conceptId="total-osts" label="Total OSTs explanation" />
        </p>
        <p className="inline-flex items-center gap-1">
          <span>
            Effective stripe width: <span className="font-medium text-foreground">{model.effectiveStripeWidth}</span>
          </span>
          <ConceptHelp conceptId="effective-stripe-width" label="Effective stripe width explanation" shortHint="Number of targets a file can effectively stripe across in this run." />
        </p>
      </div>

      <div className="rounded border border-border/70 bg-muted/20 p-2 text-xs text-foreground/75">
        <p className="break-words">
          Topology note: compute nodes may use{" "}
          <span className="inline-flex items-center gap-1">
            <span>local scratch</span>
            <ConceptHelp conceptId="local-scratch" label="Local scratch explanation" />
          </span>{" "}
          in real clusters, but this simulator primarily models the{" "}
          <span className="inline-flex items-center gap-1">
            <span>shared storage side</span>
            <ConceptHelp conceptId="shared-scratch" label="Shared scratch explanation" />
          </span>{" "}
          (metadata + striped shared data path + network).{" "}
          <span className="inline-flex items-center gap-1">
            <span>Local scratch and longer-lived storage</span>
            <ConceptHelp conceptId="long-lived-storage" label="Long-lived storage explanation" />
          </span>{" "}
          remain conceptual teaching elements unless separately modeled.
        </p>
      </div>
    </div>
  );
}
