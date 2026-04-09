import type {
  HpcLabBottleneckConfidence,
  HpcLabBottleneckKind,
  HpcLabConstraintSignals,
  HpcLabRunBottleneckAttribution,
  HpcLabSimulationResult,
  HpcLabTickBottleneckAttribution,
} from "./types";

const BALANCED_ACTIVITY_THRESHOLD = 0.2;
const DOMINANT_MARGIN_THRESHOLD = 0.12;
const MIXED_MARGIN_THRESHOLD = 0.08;
const MIN_DOMINANT_RUN_SHARE = 0.4;
const MIN_DOMINANT_SHARE_GAP = 0.1;

const PRESSURE_KEYS = ["compute", "storage", "metadata", "network"] as const;
type PressureKey = (typeof PRESSURE_KEYS)[number];

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const toPressureEntries = (signals: HpcLabConstraintSignals): Array<{ key: PressureKey; value: number }> => [
  { key: "compute", value: clamp01(signals.computePressure) },
  { key: "storage", value: clamp01(signals.storagePressure) },
  { key: "metadata", value: clamp01(signals.metadataPressure) },
  { key: "network", value: clamp01(signals.networkPressure) },
];

export const classifyTickBottleneck = (tick: number, signals: HpcLabConstraintSignals): HpcLabTickBottleneckAttribution => {
  const sorted = toPressureEntries(signals).sort((left, right) => right.value - left.value);
  const top = sorted[0];
  const second = sorted[1];
  const maxPressure = top.value;
  const marginToNext = top.value - second.value;

  if (maxPressure < BALANCED_ACTIVITY_THRESHOLD) {
    return {
      tick,
      kind: "balanced",
      dominantPressure: maxPressure,
      marginToNext,
    };
  }

  if (marginToNext <= MIXED_MARGIN_THRESHOLD) {
    return {
      tick,
      kind: "mixed",
      dominantPressure: maxPressure,
      marginToNext,
    };
  }

  if (marginToNext >= DOMINANT_MARGIN_THRESHOLD) {
    return {
      tick,
      kind: top.key,
      dominantPressure: maxPressure,
      marginToNext,
    };
  }

  return {
    tick,
    kind: "mixed",
    dominantPressure: maxPressure,
    marginToNext,
  };
};

const initShareMap = (): Record<HpcLabBottleneckKind, number> => ({
  compute: 0,
  storage: 0,
  metadata: 0,
  network: 0,
  mixed: 0,
  balanced: 0,
});

const toConfidenceLabel = (score: number): HpcLabBottleneckConfidence => {
  if (score >= 0.75) {
    return "high";
  }
  if (score >= 0.45) {
    return "medium";
  }
  return "low";
};

const toRunDominantKind = (shares: Record<HpcLabBottleneckKind, number>): HpcLabBottleneckKind => {
  if (shares.balanced >= 0.5) {
    return "balanced";
  }

  const sorted = [...PRESSURE_KEYS]
    .map((key) => ({ key, share: shares[key] }))
    .sort((left, right) => right.share - left.share);

  const top = sorted[0];
  const second = sorted[1];

  if (top.share < MIN_DOMINANT_RUN_SHARE) {
    return "mixed";
  }

  if (top.share - second.share < MIN_DOMINANT_SHARE_GAP || shares.mixed >= top.share - 0.02) {
    return "mixed";
  }

  return top.key;
};

const computeLongestStreak = (attribution: HpcLabTickBottleneckAttribution[]): number => {
  if (attribution.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < attribution.length; index += 1) {
    if (attribution[index].kind === attribution[index - 1].kind) {
      current += 1;
      longest = Math.max(longest, current);
      continue;
    }

    current = 1;
  }

  return longest;
};

const buildExplanation = (
  dominantKind: HpcLabBottleneckKind,
  dominantShare: number,
  derived: HpcLabRunBottleneckAttribution["derivedMetrics"],
): string => {
  const dominantPct = `${(dominantShare * 100).toFixed(1)}%`;

  if (dominantKind === "balanced") {
    return `No strong bottleneck detected. Pressure signals stayed low for most ticks, with queue burden at ${(derived.queueBurdenRatio * 100).toFixed(1)}%.`;
  }

  if (dominantKind === "mixed") {
    return `Mixed bottlenecks. Pressure signals shifted or remained close, with ${derived.bottleneckTransitionCount} transitions and a longest stable streak of ${derived.longestDominantStreak} ticks.`;
  }

  const labels: Record<Exclude<HpcLabBottleneckKind, "mixed" | "balanced">, string> = {
    compute: "Mostly compute-bound",
    storage: "Mostly storage-bound",
    metadata: "Mostly metadata-bound",
    network: "Mostly network-bound",
  };

  return `${labels[dominantKind]} (${dominantPct} of ticks). Throughput fulfillment is ${(derived.throughputFulfillmentRatio * 100).toFixed(1)}% and metadata service ratio is ${(derived.metadataServiceRatio * 100).toFixed(1)}%.`;
};

const buildNextSteps = (dominantKind: HpcLabBottleneckKind): string[] => {
  switch (dominantKind) {
    case "compute":
      return [
        "Increase compute or GPU nodes for active workload demand.",
        "Lower concurrent job pressure to reduce sustained queueing.",
        "Compare CPU/GPU utilization with queue burden before changing I/O settings.",
      ];
    case "storage":
      return [
        "Increase stripe width where file patterns are sequential.",
        "Add OST/OSS capacity to raise sustained storage throughput.",
        "Reduce concurrent write-heavy pressure or checkpoint overlap.",
      ];
    case "metadata":
      return [
        "Reduce metadata latency and metadata-op fanout where possible.",
        "Lower small-file concurrency or batch metadata-heavy operations.",
        "Watch metadata service ratio after each latency/concurrency change.",
      ];
    case "network":
      return [
        "Increase network bandwidth for aggregate storage traffic.",
        "Reduce peak concurrent transfer demand during heavy phases.",
        "Re-check throughput fulfillment after network or concurrency changes.",
      ];
    case "mixed":
      return [
        "Change one lever at a time and re-run to isolate the dominant limiter.",
        "Focus on intervals where top pressure signals are closest.",
        "Use time-share and transition count to prioritize first tuning steps.",
      ];
    case "balanced":
      return [
        "Increase workload intensity to reveal the first emerging constraint.",
        "Validate that requested load is high enough for stress comparison.",
        "Use longer runs if you want to observe later-phase contention.",
      ];
    default:
      return [];
  }
};

export const analyzeRunBottlenecks = (result: HpcLabSimulationResult): HpcLabRunBottleneckAttribution => {
  const perTick = result.timeline.map((tick) => classifyTickBottleneck(tick.tick, tick.constraintSignals));
  const tickCount = Math.max(1, perTick.length);

  const kindCounts = perTick.reduce<Record<HpcLabBottleneckKind, number>>((acc, tick) => {
    acc[tick.kind] += 1;
    return acc;
  }, initShareMap());

  const timeShareByKind = Object.fromEntries(
    Object.entries(kindCounts).map(([kind, count]) => [kind, count / tickCount]),
  ) as Record<HpcLabBottleneckKind, number>;

  const dominantKind = toRunDominantKind(timeShareByKind);
  const dominantTimeShare = timeShareByKind[dominantKind];

  const sortedShares = Object.entries(timeShareByKind)
    .map(([kind, share]) => ({ kind: kind as HpcLabBottleneckKind, share }))
    .sort((left, right) => right.share - left.share);
  const topShareGap = sortedShares[0].share - sortedShares[1].share;
  const confidenceScore = clamp01(dominantTimeShare * 0.8 + topShareGap * 0.8 - timeShareByKind.mixed * 0.3);

  let bottleneckTransitionCount = 0;
  for (let index = 1; index < perTick.length; index += 1) {
    if (perTick[index].kind !== perTick[index - 1].kind) {
      bottleneckTransitionCount += 1;
    }
  }

  const requestedThroughputTotal = result.timeline.reduce(
    (sum, tick) => sum + tick.requestedReadGbps + tick.requestedWriteGbps,
    0,
  );
  const deliveredThroughputTotal = result.timeline.reduce(
    (sum, tick) => sum + tick.deliveredReadGbps + tick.deliveredWriteGbps,
    0,
  );

  const requestedMetadataTotal = result.timeline.reduce((sum, tick) => sum + tick.metadataOpsRequested, 0);
  const servedMetadataTotal = result.timeline.reduce((sum, tick) => sum + tick.metadataOpsServed, 0);

  const queueTicks = result.timeline.filter((tick) => tick.queuedJobs > 0).length;
  const checkpointActiveTicks = result.timeline.filter((tick) => tick.checkpointActiveJobs > 0).length;

  const longestDominantStreak = computeLongestStreak(perTick);
  const derivedMetrics = {
    throughputFulfillmentRatio: requestedThroughputTotal > 0 ? deliveredThroughputTotal / requestedThroughputTotal : 1,
    metadataServiceRatio: requestedMetadataTotal > 0 ? servedMetadataTotal / requestedMetadataTotal : 1,
    queueBurdenRatio: queueTicks / tickCount,
    checkpointActiveTickShare: checkpointActiveTicks / tickCount,
    bottleneckTransitionCount,
    longestDominantStreak,
  };

  return {
    dominantKind,
    confidence: toConfidenceLabel(confidenceScore),
    confidenceScore,
    dominantTimeShare,
    timeShareByKind,
    perTick,
    derivedMetrics,
    bottleneckTransitionCount,
    longestDominantStreak,
    explanation: buildExplanation(dominantKind, dominantTimeShare, derivedMetrics),
    nextSteps: buildNextSteps(dominantKind),
  };
};
