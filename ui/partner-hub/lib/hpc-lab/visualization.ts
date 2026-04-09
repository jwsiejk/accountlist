import type {
  HpcLabBarChartModel,
  HpcLabChartPoint,
  HpcLabLineChartModel,
  HpcLabLineSeries,
  HpcLabSimulationResult,
  HpcLabTickSnapshot,
  HpcLabTopologyModel,
} from "./types";

const DEFAULT_MAX_POINTS = 120;
const EMPTY_OST_DISTRIBUTION_LABEL = "No OST load was delivered in this run.";

const toSeries = (key: string, label: string, points: HpcLabChartPoint[]): HpcLabLineSeries => ({ key, label, points });

const evenSampleIndices = (length: number, maxPoints: number): number[] => {
  if (maxPoints >= length) {
    return Array.from({ length }, (_, idx) => idx);
  }

  const last = length - 1;
  const step = last / (maxPoints - 1);
  const indices = new Set<number>([0, last]);

  for (let i = 1; i < maxPoints - 1; i += 1) {
    indices.add(Math.round(i * step));
  }

  return Array.from(indices).sort((a, b) => a - b);
};

export const downsampleTimelineDeterministic = (
  timeline: HpcLabTickSnapshot[],
  maxPoints: number = DEFAULT_MAX_POINTS,
): { sampled: HpcLabTickSnapshot[]; downsampled: boolean } => {
  if (timeline.length === 0) {
    return { sampled: [], downsampled: false };
  }

  if (maxPoints < 2 || timeline.length <= maxPoints) {
    return { sampled: timeline, downsampled: false };
  }

  const indices = evenSampleIndices(timeline.length, maxPoints);
  return {
    sampled: indices.map((index) => timeline[index]),
    downsampled: true,
  };
};

const chartModel = (
  title: string,
  yAxisLabel: string,
  valueFormat: HpcLabLineChartModel["valueFormat"],
  series: HpcLabLineSeries[],
  downsampled: boolean,
  sourcePoints: number,
  renderedPoints: number,
  subtitle?: string,
): HpcLabLineChartModel => ({
  title,
  subtitle,
  yAxisLabel,
  valueFormat,
  series,
  downsampled,
  sourcePoints,
  renderedPoints,
});

export const buildTopologyModel = (result: HpcLabSimulationResult): HpcLabTopologyModel => ({
  cpuNodes: result.normalizedConfig.computeNodes,
  gpuNodes: result.normalizedConfig.gpuNodes,
  ossCount: result.normalizedConfig.ossCount,
  totalOsts: result.normalizedConfig.totalOsts,
  effectiveStripeWidth: result.normalizedConfig.effectiveStripeWidth,
  networkBandwidthGbps: result.normalizedConfig.networkBandwidthGbps,
  metadataLatencyMs: result.normalizedConfig.metadataLatencyMs,
});

const fromTimeline = (
  sampledTimeline: HpcLabTickSnapshot[],
  selector: (tick: HpcLabTickSnapshot) => number,
): HpcLabChartPoint[] => sampledTimeline.map((tick) => ({ tick: tick.tick, value: selector(tick) }));

export const buildThroughputChartModel = (result: HpcLabSimulationResult, maxPoints: number = DEFAULT_MAX_POINTS): HpcLabLineChartModel => {
  const { sampled, downsampled } = downsampleTimelineDeterministic(result.timeline, maxPoints);
  return chartModel(
    "Throughput over time",
    "Gbps",
    "gbps",
    [
      toSeries("requested-throughput", "Requested total", fromTimeline(sampled, (tick) => tick.requestedReadGbps + tick.requestedWriteGbps)),
      toSeries("delivered-throughput", "Delivered total", fromTimeline(sampled, (tick) => tick.deliveredReadGbps + tick.deliveredWriteGbps)),
    ],
    downsampled,
    result.timeline.length,
    sampled.length,
  );
};

export const buildMetadataChartModel = (result: HpcLabSimulationResult, maxPoints: number = DEFAULT_MAX_POINTS): HpcLabLineChartModel => {
  const { sampled, downsampled } = downsampleTimelineDeterministic(result.timeline, maxPoints);
  return chartModel(
    "Metadata load",
    "Ops/tick",
    "ops",
    [
      toSeries("metadata-requested", "Requested ops", fromTimeline(sampled, (tick) => tick.metadataOpsRequested)),
      toSeries("metadata-served", "Served ops", fromTimeline(sampled, (tick) => tick.metadataOpsServed)),
    ],
    downsampled,
    result.timeline.length,
    sampled.length,
  );
};

export const buildQueueChartModel = (result: HpcLabSimulationResult, maxPoints: number = DEFAULT_MAX_POINTS): HpcLabLineChartModel => {
  const { sampled, downsampled } = downsampleTimelineDeterministic(result.timeline, maxPoints);
  return chartModel(
    "Job queue / active jobs",
    "Jobs",
    "count",
    [
      toSeries("queued", "Queued", fromTimeline(sampled, (tick) => tick.queuedJobs)),
      toSeries("running", "Running", fromTimeline(sampled, (tick) => tick.runningJobs)),
      toSeries("completed", "Completed", fromTimeline(sampled, (tick) => tick.completedJobs)),
    ],
    downsampled,
    result.timeline.length,
    sampled.length,
  );
};

export const buildComputeUtilizationChartModel = (
  result: HpcLabSimulationResult,
  maxPoints: number = DEFAULT_MAX_POINTS,
): HpcLabLineChartModel => {
  const { sampled, downsampled } = downsampleTimelineDeterministic(result.timeline, maxPoints);
  return chartModel(
    "Compute utilization",
    "Utilization",
    "percent",
    [
      toSeries("cpu-utilization", "CPU", fromTimeline(sampled, (tick) => tick.cpuUtilization)),
      toSeries("gpu-utilization", "GPU", fromTimeline(sampled, (tick) => tick.gpuUtilization)),
    ],
    downsampled,
    result.timeline.length,
    sampled.length,
  );
};

export const buildWaitOnDataChartModel = (result: HpcLabSimulationResult, maxPoints: number = DEFAULT_MAX_POINTS): HpcLabLineChartModel => {
  const { sampled, downsampled } = downsampleTimelineDeterministic(result.timeline, maxPoints);
  return chartModel(
    "Waiting on data",
    "Ratio",
    "percent",
    [toSeries("wait-on-data", "Wait on data", fromTimeline(sampled, (tick) => tick.waitOnDataRatio))],
    downsampled,
    result.timeline.length,
    sampled.length,
  );
};

export const buildCheckpointChartModel = (result: HpcLabSimulationResult, maxPoints: number = DEFAULT_MAX_POINTS): HpcLabLineChartModel => {
  const { sampled, downsampled } = downsampleTimelineDeterministic(result.timeline, maxPoints);
  return chartModel(
    "Checkpoint pause impact",
    "Pause ratio",
    "percent",
    [toSeries("checkpoint-pause-ratio", "Pause ratio", fromTimeline(sampled, (tick) => tick.checkpointPauseRatio))],
    downsampled,
    result.timeline.length,
    sampled.length,
  );
};

export type HpcLabMetadataUtilizationStats = {
  latest: number;
  average: number;
  peak: number;
};

export const buildMetadataUtilizationStats = (result: HpcLabSimulationResult): HpcLabMetadataUtilizationStats => {
  const timeline = result.timeline;
  if (timeline.length === 0) {
    return {
      latest: 0,
      average: 0,
      peak: 0,
    };
  }

  const latest = timeline[timeline.length - 1].metadataUtilization;
  const peak = timeline.reduce((max, tick) => Math.max(max, tick.metadataUtilization), 0);
  const average = timeline.reduce((sum, tick) => sum + tick.metadataUtilization, 0) / timeline.length;

  return {
    latest,
    average,
    peak,
  };
};

export type HpcLabCheckpointActiveJobsStats = {
  latest: number;
  average: number;
  peak: number;
};

export const buildCheckpointActiveJobsStats = (result: HpcLabSimulationResult): HpcLabCheckpointActiveJobsStats => {
  const timeline = result.timeline;
  if (timeline.length === 0) {
    return {
      latest: 0,
      average: 0,
      peak: 0,
    };
  }

  const latest = timeline[timeline.length - 1].checkpointActiveJobs;
  const peak = timeline.reduce((max, tick) => Math.max(max, tick.checkpointActiveJobs), 0);
  const average = timeline.reduce((sum, tick) => sum + tick.checkpointActiveJobs, 0) / timeline.length;

  return {
    latest,
    average,
    peak,
  };
};

export const buildConstraintSignalsChartModel = (
  result: HpcLabSimulationResult,
  maxPoints: number = DEFAULT_MAX_POINTS,
): HpcLabLineChartModel => {
  const { sampled, downsampled } = downsampleTimelineDeterministic(result.timeline, maxPoints);
  return chartModel(
    "Raw constraint signals",
    "Pressure",
    "percent",
    [
      toSeries("compute-pressure", "Compute", fromTimeline(sampled, (tick) => tick.constraintSignals.computePressure)),
      toSeries("storage-pressure", "Storage", fromTimeline(sampled, (tick) => tick.constraintSignals.storagePressure)),
      toSeries("metadata-pressure", "Metadata", fromTimeline(sampled, (tick) => tick.constraintSignals.metadataPressure)),
      toSeries("network-pressure", "Network", fromTimeline(sampled, (tick) => tick.constraintSignals.networkPressure)),
    ],
    downsampled,
    result.timeline.length,
    sampled.length,
    "Raw pressure signals behind run-level bottleneck attribution.",
  );
};

export const buildOstLoadDistributionChartModel = (result: HpcLabSimulationResult): HpcLabBarChartModel => {
  const totalOsts = Math.max(0, result.normalizedConfig.totalOsts);
  if (totalOsts === 0) {
    return {
      title: "OST load distribution",
      subtitle: EMPTY_OST_DISTRIBUTION_LABEL,
      yAxisLabel: "Avg Gbps",
      valueFormat: "gbps",
      bars: [],
    };
  }

  const totals = new Array<number>(totalOsts).fill(0);

  for (const tick of result.timeline) {
    for (let index = 0; index < totalOsts; index += 1) {
      totals[index] += tick.ostLoadGbps[index] ?? 0;
    }
  }

  const divisor = Math.max(1, result.timeline.length);
  const averages = totals.map((value) => (Number.isFinite(value) ? value / divisor : 0));

  return {
    title: "OST load distribution",
    subtitle: "Average delivered load per OST across the run",
    yAxisLabel: "Avg Gbps",
    valueFormat: "gbps",
    bars: averages.map((value, index) => ({
      label: `OST ${index + 1}`,
      value,
    })),
  };
};
