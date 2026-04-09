import type { HpcLabLineChartModel } from "@/lib/hpc-lab/types";
import { formatCount, formatDecimal, formatGbps, formatOps, formatPercent } from "@/lib/hpc-lab/format";

const SERIES_COLOR_CLASSES = [
  "text-sky-600 dark:text-sky-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-violet-600 dark:text-violet-400",
  "text-amber-600 dark:text-amber-400",
];
const SERIES_STROKE_PATTERNS = ["0", "6 3", "2 2", "10 4"];

const formatValue = (value: number, format: HpcLabLineChartModel["valueFormat"]) => {
  if (format === "percent") {
    return formatPercent(value);
  }
  if (format === "gbps") {
    return formatGbps(value);
  }
  if (format === "ops") {
    return formatOps(value);
  }
  if (format === "count") {
    return formatCount(value);
  }
  return formatDecimal(value);
};

const buildPath = (points: Array<{ x: number; y: number }>): string =>
  points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

export function MultiSeriesLineChart({ model }: { model: HpcLabLineChartModel }) {
  const width = 640;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 28, left: 44 };

  const allValues = model.series.flatMap((series) => series.points.map((point) => point.value)).filter((value) => Number.isFinite(value));
  const yMax = Math.max(1, ...allValues);
  const yMin = 0;
  const pointsCount = Math.max(1, model.series[0]?.points.length ?? 1);
  const hasSeries = model.series.length > 0;
  const hasPoints = hasSeries && model.series.some((series) => series.points.length > 0);

  if (!hasSeries || !hasPoints) {
    return <p className="text-sm text-foreground/70">No chart points available for this run.</p>;
  }

  const toX = (index: number) => {
    if (pointsCount === 1) {
      return padding.left;
    }
    const span = width - padding.left - padding.right;
    return padding.left + (span * index) / (pointsCount - 1);
  };

  const toY = (value: number) => {
    const span = height - padding.top - padding.bottom;
    const normalized = (value - yMin) / (yMax - yMin || 1);
    return height - padding.bottom - normalized * span;
  };

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, idx) => {
    const value = yMin + ((yMax - yMin) * idx) / tickCount;
    return { value, y: toY(value) };
  });

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 min-w-[520px] w-full"
          role="img"
          aria-label={`${model.title}. Y-axis in ${model.yAxisLabel}.`}
        >
        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} stroke="currentColor" opacity={0.12} />
            <text x={6} y={tick.y + 4} className="fill-foreground/70 text-[10px]">
              {formatValue(tick.value, model.valueFormat)}
            </text>
          </g>
        ))}

        {model.series.map((series, seriesIndex) => {
          const coordinates = series.points.map((point, index) => ({ x: toX(index), y: toY(point.value) }));
          return (
            <g key={series.key} className={SERIES_COLOR_CLASSES[seriesIndex % SERIES_COLOR_CLASSES.length]}>
              <path
                d={buildPath(coordinates)}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray={SERIES_STROKE_PATTERNS[seriesIndex % SERIES_STROKE_PATTERNS.length]}
              />
            </g>
          );
        })}

        <text x={padding.left} y={height - 6} className="fill-foreground/70 text-[10px]">Tick</text>
        </svg>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/80" aria-label={`${model.title} legend`}>
        {model.series.map((series, seriesIndex) => (
          <li
            key={series.key}
            className={`inline-flex items-center gap-1 ${SERIES_COLOR_CLASSES[seriesIndex % SERIES_COLOR_CLASSES.length]}`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-current" aria-hidden />
            <span>{series.label}</span>
            <span className="text-foreground/65">({SERIES_STROKE_PATTERNS[seriesIndex % SERIES_STROKE_PATTERNS.length] === "0" ? "solid" : "dashed"})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
