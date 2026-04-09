import type { HpcLabTopologyModel } from "@/lib/hpc-lab/types";

const Box = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded border border-border/70 bg-muted/30 p-2 text-center">
    <p className="text-[11px] uppercase tracking-wide text-foreground/60">{title}</p>
    <p className="break-words text-sm font-medium text-foreground">{value}</p>
  </div>
);

export function TopologyDiagram({ model }: { model: HpcLabTopologyModel }) {
  return (
    <div className="space-y-3" role="group" aria-label="Cluster topology summary">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Box title="CPU pool" value={`${model.cpuNodes} nodes`} />
        <Box title="GPU pool" value={`${model.gpuNodes} nodes`} />
      </div>

      <div className="rounded border border-border/70 bg-card px-3 py-2 text-center text-xs text-foreground/70">
        Network fabric · {model.networkBandwidthGbps} Gbps
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Box title="MDS" value={`${model.metadataLatencyMs} ms`} />
        <Box title="OSS pool" value={`${model.ossCount} OSS`} />
      </div>

      <div className="rounded border border-border/70 bg-muted/20 p-2 text-xs text-foreground/75">
        <p>Total OSTs: <span className="font-medium text-foreground">{model.totalOsts}</span></p>
        <p>Effective stripe width: <span className="font-medium text-foreground">{model.effectiveStripeWidth}</span></p>
      </div>
    </div>
  );
}
