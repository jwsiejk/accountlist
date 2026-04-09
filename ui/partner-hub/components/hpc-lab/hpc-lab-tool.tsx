"use client";

import { useMemo, useState } from "react";

import { BarDistributionChart } from "@/components/hpc-lab/charts/bar-distribution-chart";
import { BottleneckSummary } from "@/components/hpc-lab/bottleneck-summary";
import { EnvironmentExplainer } from "@/components/hpc-lab/environment-explainer";
import { GuidedWalkthrough } from "@/components/hpc-lab/guided-walkthrough";
import { InfoTooltip } from "@/components/hpc-lab/info-tooltip";
import { ChartFrame } from "@/components/hpc-lab/charts/chart-frame";
import { MultiSeriesLineChart } from "@/components/hpc-lab/charts/multi-series-line-chart";
import { TopologyDiagram } from "@/components/hpc-lab/topology-diagram";
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
import { analyzeRunBottlenecks } from "@/lib/hpc-lab/bottlenecks";
import { getHpcLabConcept } from "@/lib/hpc-lab/concepts";
import { getHpcLabPresetById, HPC_LAB_PRESETS } from "@/lib/hpc-lab/presets";
import { buildGuidedWalkthrough } from "@/lib/hpc-lab/walkthrough";
import {
  buildCheckpointActiveJobsStats,
  buildCheckpointChartModel,
  buildComputeUtilizationChartModel,
  buildConstraintSignalsChartModel,
  buildMetadataChartModel,
  buildMetadataUtilizationStats,
  buildOstLoadDistributionChartModel,
  buildQueueChartModel,
  buildThroughputChartModel,
  buildTopologyModel,
  buildWaitOnDataChartModel,
} from "@/lib/hpc-lab/visualization";
import {
  HPC_LAB_PANEL_KEYS,
  type HpcLabFileSizeDistribution,
  type HpcLabPanelKey,
  type HpcLabPresetId,
  type HpcLabSimulationResult,
  type HpcLabWorkloadType,
} from "@/lib/hpc-lab/types";
import { formatDecimal, formatGbps, formatPercent } from "@/lib/hpc-lab/format";

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

const formatTicks = (value: number) => formatDecimal(value, 2);

const CONTROL_CONCEPTS: Partial<Record<HpcLabFormNumericField, Parameters<typeof getHpcLabConcept>[0]>> = {
  computeNodes: "compute-nodes",
  gpuNodes: "gpu-nodes",
  ossCount: "oss-count",
  ostPerOss: "ost-per-oss",
  stripeWidth: "stripe-width",
  metadataLatencyMs: "metadata-latency",
  networkBandwidthGbps: "network-bandwidth",
  checkpointFrequencyMinutes: "checkpoint-frequency",
  concurrentJobs: "concurrent-jobs",
  totalTicks: "simulation-duration",
  tickDurationSeconds: "tick-duration",
};

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
  const validationErrorCount = Object.keys(validationErrors).length;
  const isDirty = useMemo(() => isFormDirtyAgainstPreset(formState, selectedPreset), [formState, selectedPreset]);
  const isRunResultStale = useMemo(
    () => !!runResult && !!lastRunFormState && !isSameFormStateValues(formState, lastRunFormState),
    [formState, lastRunFormState, runResult],
  );

  const topology = useMemo(() => (runResult ? buildTopologyModel(runResult) : null), [runResult]);
  const throughputChart = useMemo(() => (runResult ? buildThroughputChartModel(runResult) : null), [runResult]);
  const metadataChart = useMemo(() => (runResult ? buildMetadataChartModel(runResult) : null), [runResult]);
  const ostDistributionChart = useMemo(() => (runResult ? buildOstLoadDistributionChartModel(runResult) : null), [runResult]);
  const queueChart = useMemo(() => (runResult ? buildQueueChartModel(runResult) : null), [runResult]);
  const computeUtilChart = useMemo(() => (runResult ? buildComputeUtilizationChartModel(runResult) : null), [runResult]);
  const waitOnDataChart = useMemo(() => (runResult ? buildWaitOnDataChartModel(runResult) : null), [runResult]);
  const checkpointChart = useMemo(() => (runResult ? buildCheckpointChartModel(runResult) : null), [runResult]);
  const bottleneckChart = useMemo(() => (runResult ? buildConstraintSignalsChartModel(runResult) : null), [runResult]);
  const metadataUtilizationStats = useMemo(() => (runResult ? buildMetadataUtilizationStats(runResult) : null), [runResult]);
  const checkpointActiveJobsStats = useMemo(() => (runResult ? buildCheckpointActiveJobsStats(runResult) : null), [runResult]);
  const bottleneckAttribution = useMemo(() => (runResult ? analyzeRunBottlenecks(runResult) : null), [runResult]);
  const walkthrough = useMemo(
    () => (runResult && bottleneckAttribution ? buildGuidedWalkthrough(selectedPreset, runResult, bottleneckAttribution) : null),
    [bottleneckAttribution, runResult, selectedPreset],
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

  const chartNote = (downsampled: boolean) => (downsampled ? "Chart points are deterministically downsampled for rendering." : undefined);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">HPC / AI Infrastructure Learning Lab</h1>
        <p className="max-w-4xl text-sm text-foreground/70">
          Explore deterministic HPC/AI simulation outputs with run-level bottleneck attribution and supporting evidence charts.
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
          <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-foreground/80">
            <p>
              <span className="font-semibold text-foreground">Learning focus:</span> {selectedPreset.learningGuidance.learningFocus}
            </p>
            <p className="mt-1 break-words">
              <span className="font-semibold text-foreground">What to watch:</span> {selectedPreset.learningGuidance.keyKnobs.join(", ")}
            </p>
            <p className="mt-1 break-words">
              <span className="font-semibold text-foreground">Expected behavior:</span> {selectedPreset.learningGuidance.expectedBehavior}
            </p>
            <p className="mt-1 break-words">
              <span className="font-semibold text-foreground">Environment lens:</span> {selectedPreset.learningGuidance.environmentGuidance}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">What environment this lab represents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground/75">
          <p className="break-words">
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-foreground">Local scratch</span>
              <InfoTooltip
                label="Local scratch concept"
                title={getHpcLabConcept("local-scratch").hoverTitle}
                body={getHpcLabConcept("local-scratch").whyItMatters}
              />
            </span>{" "}
            is per-node temporary space and not shared across compute nodes.
          </p>
          <p className="break-words">
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-foreground">Shared scratch / parallel filesystem</span>
              <InfoTooltip
                label="Shared scratch concept"
                title={getHpcLabConcept("shared-scratch").hoverTitle}
                body={`${getHpcLabConcept("shared-scratch").explanation} ${getHpcLabConcept("ddn-exascaler-managed-lustre").realWorldMapping}`}
              />
            </span>{" "}
            is the cluster-visible active workspace modeled by this simulator.
          </p>
          <p className="break-words">
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-foreground">Home/lab/project storage</span>
              <InfoTooltip
                label="Long-lived storage concept"
                title={getHpcLabConcept("long-lived-storage").hoverTitle}
                body={getHpcLabConcept("long-lived-storage").whyItMatters}
              />
            </span>{" "}
            is longer-lived and distinct from shared scratch behavior.
          </p>
          <p className="text-xs text-foreground/70">
            Honesty note: this lab primarily models the shared filesystem path (metadata + striped data path + network), not a separate local-scratch
            performance path.
          </p>
        </CardContent>
      </Card>

      <EnvironmentExplainer bottleneckAttribution={bottleneckAttribution} />

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
                    <span className="inline-flex items-center gap-1">
                      <span>{label}</span>
                      {CONTROL_CONCEPTS[field] ? (
                        <InfoTooltip
                          label={`${label} concept`}
                          title={getHpcLabConcept(CONTROL_CONCEPTS[field]).hoverTitle}
                          body={`${getHpcLabConcept(CONTROL_CONCEPTS[field]).explanation} ${getHpcLabConcept(CONTROL_CONCEPTS[field]).whyItMatters}`}
                        />
                      ) : null}
                    </span>
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
            {!parsed.ok ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="status" aria-live="polite">
                Fix {validationErrorCount} highlighted {validationErrorCount === 1 ? "field" : "fields"} to run the simulation.
              </p>
            ) : null}
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
                <CardTitle className="text-base">Key interpretation metrics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="inline-flex items-center gap-1">
                    <span>Wait on data</span>
                    <InfoTooltip
                      label="Wait on data explanation"
                      title={getHpcLabConcept("wait-on-data").hoverTitle}
                      body={`${getHpcLabConcept("wait-on-data").explanation} High means jobs spend more time blocked on shared-path delivery; lower is better for useful work.`}
                    />
                  </span>
                  : <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgWaitOnDataRatio)}</span>
                </p>
                <p>
                  <span className="inline-flex items-center gap-1">
                    <span>Metadata utilization</span>
                    <InfoTooltip
                      label="Metadata utilization explanation"
                      title={getHpcLabConcept("metadata-utilization").hoverTitle}
                      body={`${getHpcLabConcept("metadata-utilization").explanation} High sustained values point toward metadata-path stress.`}
                    />
                  </span>
                  : <span className="font-medium text-foreground">{formatPercent(runResult.summary.avgMetadataUtilization)}</span>
                </p>
                {bottleneckAttribution ? (
                  <>
                    <p>
                      <span className="inline-flex items-center gap-1">
                        <span>Throughput fulfillment</span>
                        <InfoTooltip
                          label="Throughput fulfillment explanation"
                          title={getHpcLabConcept("throughput-fulfillment").hoverTitle}
                          body={`${getHpcLabConcept("throughput-fulfillment").explanation} Higher is healthier; low values point to shared data-path or network caps.`}
                        />
                      </span>
                      :{" "}
                      <span className="font-medium text-foreground">
                        {formatPercent(bottleneckAttribution.derivedMetrics.throughputFulfillmentRatio)}
                      </span>
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1">
                        <span>Queue burden</span>
                        <InfoTooltip
                          label="Queue burden explanation"
                          title={getHpcLabConcept("queue-burden").hoverTitle}
                          body={`${getHpcLabConcept("queue-burden").explanation} Higher means scheduler/compute admission is under heavier pressure.`}
                        />
                      </span>
                      : <span className="font-medium text-foreground">{formatPercent(bottleneckAttribution.derivedMetrics.queueBurdenRatio)}</span>
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1">
                        <span>Checkpoint-active tick share</span>
                        <InfoTooltip
                          label="Checkpoint-active tick share explanation"
                          title={getHpcLabConcept("checkpoint-active-tick-share").hoverTitle}
                          body={`${getHpcLabConcept("checkpoint-active-tick-share").explanation} Higher values suggest more checkpoint cadence overhead in this run.`}
                        />
                      </span>
                      :{" "}
                      <span className="font-medium text-foreground">
                        {formatPercent(bottleneckAttribution.derivedMetrics.checkpointActiveTickShare)}
                      </span>
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1">
                        <span>Bottleneck transitions</span>
                        <InfoTooltip
                          label="Bottleneck transitions explanation"
                          title={getHpcLabConcept("bottleneck-transitions").hoverTitle}
                          body={`${getHpcLabConcept("bottleneck-transitions").explanation} More transitions mean contention is shifting between subsystems.`}
                        />
                      </span>
                      :{" "}
                      <span className="font-medium text-foreground">{bottleneckAttribution.derivedMetrics.bottleneckTransitionCount}</span>
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1">
                        <span>Longest dominant streak</span>
                        <InfoTooltip
                          label="Longest dominant streak explanation"
                          title={getHpcLabConcept("longest-dominant-streak").hoverTitle}
                          body={`${getHpcLabConcept("longest-dominant-streak").explanation} Longer streaks indicate a clearer single limiter.`}
                        />
                      </span>
                      : <span className="font-medium text-foreground">{bottleneckAttribution.derivedMetrics.longestDominantStreak}</span>
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1">
                        <span>Bottleneck confidence</span>
                        <InfoTooltip
                          label="Bottleneck confidence explanation"
                          title={getHpcLabConcept("bottleneck-confidence").hoverTitle}
                          body={`${getHpcLabConcept("bottleneck-confidence").explanation} Higher confidence means one pressure class stayed more clearly dominant.`}
                        />
                      </span>
                      : <span className="font-medium text-foreground">{bottleneckAttribution.confidence}</span>
                    </p>
                    <p>
                      <span className="inline-flex items-center gap-1">
                        <span>Dominant time share</span>
                        <InfoTooltip
                          label="Dominant time share explanation"
                          title={getHpcLabConcept("dominant-time-share").hoverTitle}
                          body={`${getHpcLabConcept("dominant-time-share").explanation} Higher share indicates a clearer subsystem to tune first.`}
                        />
                      </span>
                      : <span className="font-medium text-foreground">{formatPercent(bottleneckAttribution.dominantTimeShare)}</span>
                    </p>
                  </>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {runResult ? (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Run summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                {isRunResultStale ? (
                  <p className="sm:col-span-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700" aria-live="polite">
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
                <p className="sm:col-span-2 break-words text-foreground/70">
                  Effective stripe width after normalization: <span className="font-medium text-foreground">{runResult.normalizedConfig.effectiveStripeWidth}</span>
                </p>
              </CardContent>
            </Card>
          ) : null}

          {runResult ? (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Bottleneck summary</CardTitle>
              </CardHeader>
              <CardContent>
                <BottleneckSummary attribution={bottleneckAttribution} stale={isRunResultStale} />
              </CardContent>
            </Card>
          ) : null}

          {runResult ? (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Guided walkthrough</CardTitle>
              </CardHeader>
              <CardContent>
                <GuidedWalkthrough walkthrough={walkthrough} stale={isRunResultStale} />
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
                  {panelKey === "cluster-topology" ? (
                    <ChartFrame
                      title="Cluster topology"
                      showTitle={false}
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to render topology from normalized configuration."
                      children={topology ? <TopologyDiagram model={topology} /> : null}
                    />
                  ) : null}

                  {panelKey === "throughput-over-time" ? (
                    <ChartFrame
                      title="Throughput over time"
                      showTitle={false}
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to view requested vs delivered throughput."
                      note={throughputChart ? chartNote(throughputChart.downsampled) : undefined}
                      children={throughputChart ? <MultiSeriesLineChart model={throughputChart} /> : null}
                    />
                  ) : null}

                  {panelKey === "metadata-load" ? (
                    <ChartFrame
                      title="Metadata load"
                      showTitle={false}
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to view metadata requested and served over time."
                      note={metadataChart ? chartNote(metadataChart.downsampled) : undefined}
                      children={
                        metadataChart ? (
                          <div className="space-y-3">
                            <MultiSeriesLineChart model={metadataChart} />
                            {metadataUtilizationStats ? (
                              <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-foreground/75">
                                <p className="break-words">
                                  Metadata utilization (separate from ops axis): latest{" "}
                                  <span className="font-medium text-foreground">{formatPercent(metadataUtilizationStats.latest)}</span> · avg{" "}
                                  <span className="font-medium text-foreground">{formatPercent(metadataUtilizationStats.average)}</span> · peak{" "}
                                  <span className="font-medium text-foreground">{formatPercent(metadataUtilizationStats.peak)}</span>
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null
                      }
                    />
                  ) : null}

                  {panelKey === "ost-load-distribution" ? (
                    <ChartFrame
                      title="OST load distribution"
                      showTitle={false}
                      subtitle="Average load per OST across the run"
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to view average OST distribution."
                      children={ostDistributionChart ? <BarDistributionChart model={ostDistributionChart} /> : null}
                    />
                  ) : null}

                  {panelKey === "job-queue-active-jobs" ? (
                    <ChartFrame
                      title="Job queue / active jobs"
                      showTitle={false}
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to view queued, running, and completed jobs."
                      note={queueChart ? chartNote(queueChart.downsampled) : undefined}
                      children={queueChart ? <MultiSeriesLineChart model={queueChart} /> : null}
                    />
                  ) : null}

                  {panelKey === "compute-utilization" ? (
                    <ChartFrame
                      title="Compute utilization"
                      showTitle={false}
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to view CPU and GPU utilization."
                      note={computeUtilChart ? chartNote(computeUtilChart.downsampled) : undefined}
                      children={computeUtilChart ? <MultiSeriesLineChart model={computeUtilChart} /> : null}
                    />
                  ) : null}

                  {panelKey === "waiting-on-data" ? (
                    <ChartFrame
                      title="Waiting on data"
                      showTitle={false}
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to view wait-on-data ratio over time."
                      note={waitOnDataChart ? chartNote(waitOnDataChart.downsampled) : undefined}
                      children={waitOnDataChart ? <MultiSeriesLineChart model={waitOnDataChart} /> : null}
                    />
                  ) : null}

                  {panelKey === "checkpoint-pause-impact" ? (
                    <ChartFrame
                      title="Checkpoint pause impact"
                      showTitle={false}
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to view checkpoint pause ratio and checkpoint-active jobs."
                      note={checkpointChart ? chartNote(checkpointChart.downsampled) : undefined}
                      children={
                        checkpointChart ? (
                          <div className="space-y-3">
                            <MultiSeriesLineChart model={checkpointChart} />
                            {checkpointActiveJobsStats ? (
                              <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-foreground/75">
                                <p className="break-words">
                                  Checkpoint-active jobs (separate from pause-ratio axis): latest{" "}
                                  <span className="font-medium text-foreground">{checkpointActiveJobsStats.latest.toFixed(0)}</span> · avg{" "}
                                  <span className="font-medium text-foreground">{checkpointActiveJobsStats.average.toFixed(2)}</span> · peak{" "}
                                  <span className="font-medium text-foreground">{checkpointActiveJobsStats.peak.toFixed(0)}</span>
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null
                      }
                    />
                  ) : null}

                  {panelKey === "bottleneck-attribution" ? (
                    <ChartFrame
                      title="Bottleneck attribution"
                      showTitle={false}
                      subtitle="Raw constraint signals"
                      stale={isRunResultStale}
                      emptyMessage="Run a simulation to view compute/storage/metadata/network pressure signals."
                      note={bottleneckChart ? `${chartNote(bottleneckChart.downsampled) ?? ""} ${bottleneckChart.subtitle ?? ""}`.trim() : undefined}
                      children={
                        bottleneckChart ? (
                          <div className="space-y-3">
                            <MultiSeriesLineChart model={bottleneckChart} />
                            <p className="break-words text-xs text-foreground/70">
                              This chart shows the raw pressure signals behind the run-level bottleneck summary.
                            </p>
                          </div>
                        ) : null
                      }
                    />
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
