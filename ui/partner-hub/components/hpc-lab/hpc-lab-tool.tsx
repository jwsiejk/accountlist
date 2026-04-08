"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HPC_LAB_PRESETS } from "@/lib/hpc-lab/presets";
import {
  HPC_LAB_PANEL_KEYS,
  type HpcLabConfig,
  type HpcLabFileSizeDistribution,
  type HpcLabPanelKey,
  type HpcLabPresetId,
  type HpcLabWorkloadType,
} from "@/lib/hpc-lab/types";

const panelTitles: Record<HpcLabPanelKey, string> = {
  "cluster-topology": "Cluster topology",
  "throughput-over-time": "Throughput over time",
  "metadata-load": "Metadata load",
  "ost-load-distribution": "OST load distribution",
  "job-queue-active-jobs": "Job queue / active jobs",
  "compute-utilization": "Compute utilization",
  "waiting-on-data": "Waiting on data",
  "checkpoint-pause-impact": "Checkpoint pause impact",
  "bottleneck-attribution": "Bottleneck attribution",
};

const workloadTypeLabels: Record<HpcLabWorkloadType, string> = {
  "traditional-hpc": "Traditional HPC",
  "distributed-ai-training": "Distributed AI Training",
  "metadata-heavy": "Metadata Heavy",
};

const fileSizeDistributionLabels: Record<HpcLabFileSizeDistribution, string> = {
  "large-sequential": "Large Sequential",
  mixed: "Mixed",
  "small-random": "Small Random",
};

const formatWorkloadType = (value: HpcLabWorkloadType) => workloadTypeLabels[value];

const formatFileSizeDistribution = (value: HpcLabFileSizeDistribution) => fileSizeDistributionLabels[value];

const controlRows: Array<{ label: string; renderValue: (config: HpcLabConfig) => string | number }> = [
  { label: "Compute nodes", renderValue: (config) => config.computeNodes },
  { label: "GPU nodes", renderValue: (config) => config.gpuNodes },
  { label: "OSS count", renderValue: (config) => config.ossCount },
  { label: "OST per OSS", renderValue: (config) => config.ostPerOss },
  { label: "Total OSTs", renderValue: (config) => config.ossCount * config.ostPerOss },
  { label: "Stripe width", renderValue: (config) => config.stripeWidth },
  { label: "Metadata latency", renderValue: (config) => `${config.metadataLatencyMs} ms` },
  { label: "Network bandwidth", renderValue: (config) => `${config.networkBandwidthGbps} Gbps` },
  { label: "Workload type", renderValue: (config) => formatWorkloadType(config.workloadType) },
  { label: "File size distribution", renderValue: (config) => formatFileSizeDistribution(config.fileSizeDistribution) },
  { label: "Checkpoint frequency", renderValue: (config) => `${config.checkpointFrequencyMinutes} minutes` },
  { label: "Concurrent jobs", renderValue: (config) => config.concurrentJobs },
];

export function HpcLabTool() {
  const [selectedPresetId, setSelectedPresetId] = useState<HpcLabPresetId>("classic-hpc");

  const selectedPreset = useMemo(
    () => HPC_LAB_PRESETS.find((preset) => preset.id === selectedPresetId) ?? HPC_LAB_PRESETS[0],
    [selectedPresetId],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">HPC / AI Infrastructure Learning Lab</h1>
        <p className="max-w-4xl text-sm text-foreground/70">
          Use this lab to compare infrastructure configuration profiles. Phase 2 now provides a deterministic engine core in lib/hpc-lab, while UI state wiring and visualization remain deferred.
        </p>
      </header>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Preset profile</CardTitle>
            <p className="text-sm text-foreground/70">Select a baseline workload profile to inspect the initial lab configuration.</p>
          </div>
          <div className="w-full max-w-xs space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground/60" htmlFor="hpc-lab-preset-select">
              Preset
            </label>
            <select
              id="hpc-lab-preset-select"
              className="h-10 w-full rounded-md border border-border/70 bg-card px-3 text-sm text-foreground"
              value={selectedPresetId}
              onChange={(event) => setSelectedPresetId(event.target.value as HpcLabPresetId)}
            >
              {HPC_LAB_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/70">
          <p>{selectedPreset.description}</p>
          <Button type="button" variant="secondary" disabled>
            Simulation wiring arrives in Phase 3
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Controls scaffold</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {controlRows.map((row) => {
              const formatted = row.renderValue(selectedPreset.initialConfig);

              return (
                <div key={row.label} className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  <span className="text-foreground/70">{row.label}</span>
                  <span className="text-right font-medium text-foreground">{formatted}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {HPC_LAB_PANEL_KEYS.map((panelKey) => (
            <Card key={panelKey} className="border-border/70">
              <CardHeader>
                <CardTitle className="text-sm">{panelTitles[panelKey]}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/70">
                  Visualization arrives in Phase 4. Phase 2 adds the engine foundation only.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
