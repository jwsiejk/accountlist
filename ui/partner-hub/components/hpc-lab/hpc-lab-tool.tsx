"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildFormStateFromPreset,
  isFormDirtyAgainstPreset,
  isSameFormStateValues,
  parseFormStateToSimulationInput,
  resetFormStateToPreset,
  type HpcLabFormNumericField,
  type HpcLabFormState,
} from "@/lib/hpc-lab/form";
import { simulateHpcLab } from "@/lib/hpc-lab/engine";
import { getHpcLabPresetById, HPC_LAB_PRESETS } from "@/lib/hpc-lab/presets";
import {
  HPC_LAB_PANEL_KEYS,
  type HpcLabFileSizeDistribution,
  type HpcLabPanelKey,
  type HpcLabPresetId,
  type HpcLabSimulationResult,
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

const numericFieldMetadata: Array<{ field: HpcLabFormNumericField; label: string; suffix?: string }> = [
  { field: "computeNodes", label: "Compute nodes" },
  { field: "gpuNodes", label: "GPU nodes" },
  { field: "ossCount", label: "OSS count" },
  { field: "ostPerOss", label: "OST per OSS" },
  { field: "stripeWidth", label: "Stripe width" },
  { field: "metadataLatencyMs", label: "Metadata latency", suffix: "ms" },
  { field: "networkBandwidthGbps", label: "Network bandwidth", suffix: "Gbps" },
  { field: "checkpointFrequencyMinutes", label: "Checkpoint frequency", suffix: "minutes" },
  { field: "concurrentJobs", label: "Concurrent jobs" },
  { field: "totalTicks", label: "Simulation duration", suffix: "ticks" },
  { field: "tickDurationSeconds", label: "Tick duration", suffix: "seconds" },
];

const formatPercent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
const formatGbps = (value: number) => `${value.toFixed(2)} Gbps`;
const formatTicks = (value: number) => value.toFixed(2);

export function HpcLabTool() {
  const initialPreset = HPC_LAB_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<HpcLabPresetId>(initialPreset.id);
  const [formState, setFormState] = useState<HpcLabFormState>(() => buildFormStateFromPreset(initialPreset));
  const [runResult, setRunResult] = useState<HpcLabSimulationResult | null>(null);
  const [touchedFields, setTouchedFields] = useState<Partial<Record<HpcLabFormNumericField, boolean>>>({});
  const [lastRunFormState, setLastRunFormState] = useState<HpcLabFormState | null>(null);

  const selectedPreset = useMemo(
    () => getHpcLabPresetById(selectedPresetId) ?? initialPreset,
    [initialPreset, selectedPresetId],
  );

  const parsed = useMemo(() => parseFormStateToSimulationInput(formState), [formState]);
  const validationErrors = parsed.ok ? {} : parsed.errors;
  const isDirty = useMemo(() => isFormDirtyAgainstPreset(formState, selectedPreset), [formState, selectedPreset]);
  const isRunResultStale = useMemo(
    () => !!runResult && !!lastRunFormState && !isSameFormStateValues(formState, lastRunFormState),
    [formState, lastRunFormState, runResult],
  );

  const onNumericChange = (field: HpcLabFormNumericField, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const onPresetChange = (presetId: HpcLabPresetId) => {
    const preset = getHpcLabPresetById(presetId) ?? initialPreset;
    setSelectedPresetId(preset.id);
    setFormState(resetFormStateToPreset(preset));
    setTouchedFields({});
    setLastRunFormState(null);
    setRunResult(null);
  };

  const onRunSimulation = () => {
    const current = parseFormStateToSimulationInput(formState);
    if (!current.ok) {
      setTouchedFields((existing) =>
        numericFieldMetadata.reduce<Partial<Record<HpcLabFormNumericField, boolean>>>(
          (next, { field }) => ({ ...next, [field]: true }),
          existing,
        ),
      );
      return;
    }

    setRunResult(simulateHpcLab(current.config, current.options));
    setLastRunFormState(formState);
  };

  const onResetToPreset = () => {
    setFormState(resetFormStateToPreset(selectedPreset));
    setTouchedFields({});
    setLastRunFormState(null);
    setRunResult(null);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">HPC / AI Infrastructure Learning Lab</h1>
        <p className="max-w-4xl text-sm text-foreground/70">
          Phase 3 wires controls to local deterministic simulation execution. Phase 4 will add topology and observability visualization layers.
        </p>
      </header>

      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Preset profile</CardTitle>
            <p className="text-sm text-foreground/70">Select a baseline profile, edit controls, then run the deterministic simulation locally.</p>
          </div>
          <div className="w-full max-w-xs space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-foreground/60" htmlFor="hpc-lab-preset-select">
              Preset
            </label>
            <select
              id="hpc-lab-preset-select"
              className="h-10 w-full rounded-md border border-border/70 bg-card px-3 text-sm text-foreground"
              value={selectedPresetId}
              onChange={(event) => onPresetChange(event.target.value as HpcLabPresetId)}
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
          <p>
            Active preset: <span className="font-medium text-foreground">{selectedPreset.name}</span>
            {isDirty ? <span className="ml-2 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600">Modified</span> : null}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Simulation controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {numericFieldMetadata.map(({ field, label, suffix }) => (
                <div key={field} className="space-y-1">
                  {touchedFields[field] && validationErrors[field] ? (
                    <p id={`hpc-lab-${field}-error`} className="text-xs text-destructive">
                      {validationErrors[field]}
                    </p>
                  ) : null}
                  <label htmlFor={`hpc-lab-${field}`} className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    {label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`hpc-lab-${field}`}
                      value={formState[field]}
                      onChange={(event) => onNumericChange(field, event.target.value)}
                      onBlur={() => setTouchedFields((current) => ({ ...current, [field]: true }))}
                      className="h-10 w-full rounded-md border border-border/70 bg-card px-3 text-sm text-foreground"
                      inputMode="decimal"
                      aria-invalid={touchedFields[field] && validationErrors[field] ? true : undefined}
                      aria-describedby={touchedFields[field] && validationErrors[field] ? `hpc-lab-${field}-error` : undefined}
                    />
                    {suffix ? <span className="text-xs text-foreground/60">{suffix}</span> : null}
                  </div>
                </div>
              ))}

              <div className="space-y-1">
                <label htmlFor="hpc-lab-workload-type" className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  Workload type
                </label>
                <select
                  id="hpc-lab-workload-type"
                  className="h-10 w-full rounded-md border border-border/70 bg-card px-3 text-sm text-foreground"
                  value={formState.workloadType}
                  onChange={(event) => setFormState((current) => ({ ...current, workloadType: event.target.value as HpcLabWorkloadType }))}
                >
                  {Object.entries(workloadTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="hpc-lab-file-size" className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                  File size distribution
                </label>
                <select
                  id="hpc-lab-file-size"
                  className="h-10 w-full rounded-md border border-border/70 bg-card px-3 text-sm text-foreground"
                  value={formState.fileSizeDistribution}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, fileSizeDistribution: event.target.value as HpcLabFileSizeDistribution }))
                  }
                >
                  {Object.entries(fileSizeDistributionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={onRunSimulation} disabled={!parsed.ok}>
                Run simulation
              </Button>
              <Button type="button" variant="secondary" onClick={onResetToPreset}>
                Reset to preset defaults
              </Button>
            </div>
            {parsed.ok ? (
              <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-foreground/80">
                <p>
                  Total OSTs: <span className="font-medium text-foreground">{parsed.config.totalOsts}</span>
                </p>
                <p>
                  Effective stripe width: <span className="font-medium text-foreground">{parsed.config.effectiveStripeWidth}</span>
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {runResult ? (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Phase 3 run summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                {isRunResultStale ? (
                  <p className="sm:col-span-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700">
                    Results reflect the last run. Run simulation again to update.
                  </p>
                ) : null}
                <p>Total completed jobs: <span className="font-medium text-foreground">{runResult.summary.totalCompletedJobs}</span></p>
                <p>Peak queued jobs: <span className="font-medium text-foreground">{runResult.summary.peakQueuedJobs}</span></p>
                <p>Avg CPU utilization: <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgCpuUtilization)}</span></p>
                <p>Avg GPU utilization: <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgGpuUtilization)}</span></p>
                <p>Avg network utilization: <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgNetworkUtilization)}</span></p>
                <p>Avg metadata utilization: <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgMetadataUtilization)}</span></p>
                <p>Avg wait-on-data ratio: <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgWaitOnDataRatio)}</span></p>
                <p>Avg delivered read throughput: <span className="font-medium text-foreground">{formatGbps(runResult.summary.avgDeliveredReadGbps)}</span></p>
                <p>Avg delivered write throughput: <span className="font-medium text-foreground">{formatGbps(runResult.summary.avgDeliveredWriteGbps)}</span></p>
                <p>Total effective work ticks: <span className="font-medium text-foreground">{formatTicks(runResult.summary.totalEffectiveWorkTicks)}</span></p>
                <p>Avg completed work ratio: <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgCompletedWorkRatio)}</span></p>
                <p>Avg checkpoint pause ratio: <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgCheckpointPauseRatio)}</span></p>
                <p className="sm:col-span-2 text-foreground/70">
                  Effective stripe width after normalization: <span className="font-medium text-foreground">{runResult.normalizedConfig.effectiveStripeWidth}</span>
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {HPC_LAB_PANEL_KEYS.map((panelKey) => (
              <Card key={panelKey} className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-sm">{panelTitles[panelKey]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/70">
                    {runResult
                      ? isRunResultStale
                        ? "Last run is stale after control changes. Run simulation again. Visualization arrives in Phase 4."
                        : "Simulation run complete. Visualization arrives in Phase 4."
                      : "Run a simulation to prepare data. Visualization arrives in Phase 4."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
