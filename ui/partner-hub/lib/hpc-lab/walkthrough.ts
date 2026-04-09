import type {
  HpcLabGuidedWalkthrough,
  HpcLabPreset,
  HpcLabRunBottleneckAttribution,
  HpcLabSimulationResult,
  HpcLabWalkthroughEvidenceItem,
  HpcLabWalkthroughExperiment,
} from "./types";
import { buildEnvironmentResultContext } from "./environment";

const toPercent = (value: number): number => Math.max(0, Math.min(1, value));

const buildEvidence = (
  result: HpcLabSimulationResult,
  attribution: HpcLabRunBottleneckAttribution,
): HpcLabWalkthroughEvidenceItem[] => [
  {
    metric: "total-completed-jobs",
    label: "Total completed jobs",
    value: result.summary.totalCompletedJobs,
    format: "count",
    interpretation: "How many jobs fully finished within this run horizon.",
  },
  {
    metric: "avg-completed-work-ratio",
    label: "Avg completed work ratio",
    value: toPercent(result.summary.avgCompletedWorkRatio),
    format: "percent",
    interpretation: "Useful progress made, even for jobs that did not finish.",
  },
  {
    metric: "queue-burden-ratio",
    label: "Queue burden ratio",
    value: toPercent(attribution.derivedMetrics.queueBurdenRatio),
    format: "percent",
    interpretation: "Share of ticks where demand exceeded schedulable compute capacity.",
  },
  {
    metric: "throughput-fulfillment-ratio",
    label: "Throughput fulfillment ratio",
    value: toPercent(attribution.derivedMetrics.throughputFulfillmentRatio),
    format: "percent",
    interpretation: "Delivered data-path throughput divided by requested throughput.",
  },
  {
    metric: "metadata-service-ratio",
    label: "Metadata service ratio",
    value: toPercent(attribution.derivedMetrics.metadataServiceRatio),
    format: "percent",
    interpretation: "Metadata ops served versus metadata ops requested.",
  },
  {
    metric: "avg-wait-on-data-ratio",
    label: "Avg wait-on-data ratio",
    value: toPercent(result.summary.avgWaitOnDataRatio),
    format: "percent",
    interpretation: "Time jobs spent waiting on data path activity instead of useful work.",
  },
  {
    metric: "checkpoint-active-tick-share",
    label: "Checkpoint-active tick share",
    value: toPercent(attribution.derivedMetrics.checkpointActiveTickShare),
    format: "percent",
    interpretation: "Share of ticks where checkpoint logic was active.",
  },
  {
    metric: "dominant-time-share",
    label: "Dominant bottleneck time share",
    value: toPercent(attribution.dominantTimeShare),
    format: "percent",
    interpretation: "How often one bottleneck label dominated the run.",
  },
  {
    metric: "bottleneck-transition-count",
    label: "Bottleneck transition count",
    value: attribution.bottleneckTransitionCount,
    format: "count",
    interpretation: "How many times the dominant bottleneck changed across ticks.",
  },
  {
    metric: "longest-dominant-streak",
    label: "Longest dominant streak",
    value: attribution.longestDominantStreak,
    format: "count",
    interpretation: "Longest uninterrupted span with the same dominant bottleneck kind.",
  },
];

const buildHeadline = (result: HpcLabSimulationResult, attribution: HpcLabRunBottleneckAttribution): string => {
  if (result.summary.totalCompletedJobs === 0 && result.summary.avgCompletedWorkRatio > 0) {
    return "No jobs finished, but the run still showed meaningful partial progress.";
  }

  if (attribution.dominantKind === "mixed") {
    return "No single limiter dominated; this run shows interacting constraints.";
  }

  if (attribution.dominantKind === "balanced") {
    return "No strong bottleneck dominated this run horizon.";
  }

  return `${attribution.explanation.split(".")[0]}.`;
};

const buildWhy = (result: HpcLabSimulationResult, attribution: HpcLabRunBottleneckAttribution): string => {
  const throughput = attribution.derivedMetrics.throughputFulfillmentRatio;
  const metadata = attribution.derivedMetrics.metadataServiceRatio;
  const queue = attribution.derivedMetrics.queueBurdenRatio;
  const waitOnData = result.summary.avgWaitOnDataRatio;

  if (attribution.dominantKind === "metadata") {
    return `Metadata service remained the limiting stage for much of the run. Metadata service ratio stayed at ${(metadata * 100).toFixed(1)}%, and average wait-on-data was ${(waitOnData * 100).toFixed(1)}%, so jobs spent significant time blocked before data operations could complete.`;
  }

  if (attribution.dominantKind === "compute") {
    return `Compute admission pressure dominated: queue burden was ${(queue * 100).toFixed(1)}%, so many jobs waited for CPU/GPU slots before doing useful work.`;
  }

  if (attribution.dominantKind === "network") {
    return `Network delivery capped progress. Throughput fulfillment stayed at ${(throughput * 100).toFixed(1)}%, which means requested data movement was not fully delivered.`;
  }

  if (attribution.dominantKind === "storage") {
    return `Storage path pressure dominated enough ticks to slow completion. Throughput fulfillment was ${(throughput * 100).toFixed(1)}%, with jobs repeatedly waiting for sustained data service.`;
  }

  if (attribution.dominantKind === "mixed") {
    return `Pressure signals were close or changed frequently (${attribution.bottleneckTransitionCount} transitions, longest streak ${attribution.longestDominantStreak} ticks), so no single subsystem stayed dominant long enough to claim one clear limiter.`;
  }

  return `Constraint signals stayed relatively low or spread out, so this run is best treated as baseline behavior over ${result.options.totalTicks} ticks rather than a single-bottleneck event.`;
};

const buildWhatHappened = (result: HpcLabSimulationResult, attribution: HpcLabRunBottleneckAttribution): string => {
  const completed = result.summary.totalCompletedJobs;
  const progressRatio = result.summary.avgCompletedWorkRatio;
  const queue = attribution.derivedMetrics.queueBurdenRatio;
  const throughput = attribution.derivedMetrics.throughputFulfillmentRatio;

  if (completed === 0 && progressRatio > 0) {
    const horizonLikelyShort = progressRatio >= 0.35 && queue < 0.35 && throughput >= 0.7;
    if (horizonLikelyShort) {
      return `Jobs advanced (${(progressRatio * 100).toFixed(1)}% average work completion) but did not reach full runtime in ${result.options.totalTicks} ticks. This points more to run horizon length than total system failure.`;
    }

    return `No job completed, but average work completion reached ${(progressRatio * 100).toFixed(1)}%. The run still teaches where progress is being slowed by sustained pressure.`;
  }

  if (completed === 0) {
    return "No jobs completed and useful work stayed very limited, indicating strong constraints over most ticks.";
  }

  return `${completed} jobs completed with ${(progressRatio * 100).toFixed(1)}% average work completion across the workload mix.`;
};

const appendUniqueExperiment = (experiments: HpcLabWalkthroughExperiment[], experiment: HpcLabWalkthroughExperiment): void => {
  if (experiments.some((current) => current.change === experiment.change)) {
    return;
  }
  experiments.push(experiment);
};

const buildExperiments = (
  preset: HpcLabPreset,
  result: HpcLabSimulationResult,
  attribution: HpcLabRunBottleneckAttribution,
): HpcLabWalkthroughExperiment[] => {
  const experiments: HpcLabWalkthroughExperiment[] = [];

  if (attribution.dominantKind === "metadata") {
    appendUniqueExperiment(experiments, {
      title: "Lower metadata latency",
      change: "Reduce metadataLatencyMs only, then re-run.",
      reason: "Tests whether metadata service ratio improves and wait-on-data falls.",
    });
    appendUniqueExperiment(experiments, {
      title: "Lower metadata fan-in pressure",
      change: "Reduce concurrentJobs only, then compare queue burden and metadata service ratio.",
      reason: "Isolates whether request concurrency is overwhelming metadata service.",
    });
    appendUniqueExperiment(experiments, {
      title: "Revisit striping after metadata improves",
      change: "Keep metadataLatencyMs at the improved value, then increase stripeWidth only.",
      reason: "Checks data-path gains after metadata bottleneck is reduced.",
    });
  }

  if (attribution.dominantKind === "compute") {
    appendUniqueExperiment(experiments, {
      title: "Reduce admission pressure",
      change: "Lower concurrentJobs only, then re-run.",
      reason: "Validates whether queue burden drops and completions rise.",
    });
    appendUniqueExperiment(experiments, {
      title: "Add compute capacity",
      change: "Increase computeNodes (or gpuNodes for AI) only.",
      reason: "Tests if faster admission, not I/O changes, drives better progress.",
    });
  }

  if (attribution.dominantKind === "network") {
    appendUniqueExperiment(experiments, {
      title: "Increase network cap",
      change: "Increase networkBandwidthGbps only.",
      reason: "Checks whether throughput fulfillment rises with a higher network ceiling.",
    });
    appendUniqueExperiment(experiments, {
      title: "Lower concurrent transfer demand",
      change: "Reduce concurrentJobs only.",
      reason: "Isolates demand-side relief without changing storage metadata behavior.",
    });
  }

  if (attribution.dominantKind === "storage") {
    appendUniqueExperiment(experiments, {
      title: "Increase striping parallelism",
      change: "Increase stripeWidth only.",
      reason: "Tests whether delivered throughput improves when more OSTs are engaged.",
    });
    appendUniqueExperiment(experiments, {
      title: "Ease sustained write/read pressure",
      change: "Reduce concurrentJobs only.",
      reason: "Checks whether storage pressure was primarily caused by fan-in.",
    });
  }

  if (attribution.dominantKind === "mixed" || attribution.dominantKind === "balanced") {
    appendUniqueExperiment(experiments, {
      title: "Run controlled isolation step",
      change: "Change one knob from the preset key knobs, then re-run with all others fixed.",
      reason: "Mixed/balanced runs are most useful when each variable is isolated.",
    });
    appendUniqueExperiment(experiments, {
      title: "Force a comparison bottleneck",
      change: "Lower networkBandwidthGbps only for one run to observe whether network pressure becomes dominant.",
      reason: "Creates a known contrast case that helps interpret current evidence.",
    });
  }

  if (result.summary.totalCompletedJobs === 0 && result.summary.avgCompletedWorkRatio > 0.2) {
    appendUniqueExperiment(experiments, {
      title: "Extend run horizon",
      change: "Increase totalTicks only.",
      reason: "Distinguishes short-horizon effects from hard system limits.",
    });
  }

  if (
    result.normalizedConfig.workloadType === "distributed-ai-training" &&
    attribution.derivedMetrics.checkpointActiveTickShare >= 0.12
  ) {
    appendUniqueExperiment(experiments, {
      title: "Spread checkpoint bursts",
      change: "Increase checkpointFrequencyMinutes only.",
      reason: "Tests whether fewer checkpoint-active ticks improve useful work progress.",
    });
  }

  if (experiments.length < 2) {
    appendUniqueExperiment(experiments, {
      title: "Follow preset guidance",
      change: `Change one of: ${preset.learningGuidance.keyKnobs.slice(0, 2).join(" or ")}.`,
      reason: "Keeps the next run focused and comparable.",
    });
  }

  return experiments.slice(0, 4);
};

const buildTeachingTakeaway = (
  preset: HpcLabPreset,
  result: HpcLabSimulationResult,
  attribution: HpcLabRunBottleneckAttribution,
): string => {
  if (result.normalizedConfig.workloadType === "distributed-ai-training" && attribution.derivedMetrics.checkpointActiveTickShare >= 0.12) {
    return `Checkpoint phases consumed ${(attribution.derivedMetrics.checkpointActiveTickShare * 100).toFixed(1)}% of ticks, showing how bursty checkpoint behavior can reduce useful training progress even with available compute.`;
  }

  if (attribution.dominantKind === "metadata") {
    return `This run reinforces a Lustre-style lesson: metadata service saturation can dominate end-to-end progress even when OST capacity exists.`;
  }

  if (attribution.dominantKind === "compute") {
    return `Queue burden at ${(attribution.derivedMetrics.queueBurdenRatio * 100).toFixed(1)}% shows a scheduler-side scarcity pattern: queued jobs indicate compute admission limits more than data-path limits.`;
  }

  if (result.summary.avgCpuUtilization < 0.75 && result.summary.avgGpuUtilization < 0.75 && result.summary.avgWaitOnDataRatio > 0.35) {
    return `Compute was not saturated, but wait-on-data stayed high, which is a classic sign that data-path gates can throttle useful work before cores are full.`;
  }

  if (attribution.dominantKind === "mixed" || attribution.dominantKind === "balanced") {
    return `When no single bottleneck dominates, HPC tuning should use controlled one-variable experiments to separate interacting constraints before scaling decisions.`;
  }

  return `${preset.learningGuidance.learningFocus} This run shows that bottleneck labels are most useful when read alongside queue, wait, and fulfillment evidence.`;
};

const buildCaveats = (result: HpcLabSimulationResult, attribution: HpcLabRunBottleneckAttribution): string[] => {
  const caveats: string[] = [];

  if (result.summary.totalCompletedJobs === 0) {
    caveats.push("No jobs completed in this horizon, so interpret this run as an in-horizon behavior signal, not an endpoint outcome.");
  }

  if (attribution.dominantKind === "mixed" || attribution.dominantKind === "balanced") {
    caveats.push("No single sustained bottleneck was dominant; isolate one variable per rerun before drawing conclusions.");
  }

  return caveats;
};

export const buildGuidedWalkthrough = (
  preset: HpcLabPreset,
  result: HpcLabSimulationResult,
  attribution: HpcLabRunBottleneckAttribution,
): HpcLabGuidedWalkthrough => ({
  headline: buildHeadline(result, attribution),
  whatHappened: buildWhatHappened(result, attribution),
  whyItHappened: buildWhy(result, attribution),
  whatToLearn: buildTeachingTakeaway(preset, result, attribution),
  environmentContext: buildEnvironmentResultContext(attribution),
  nextExperiments: buildExperiments(preset, result, attribution),
  evidence: buildEvidence(result, attribution),
  runCaveats: buildCaveats(result, attribution),
});
