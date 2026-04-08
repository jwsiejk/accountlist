import type { HpcLabLineChartModel } from "@/lib/hpc-lab/types";

const COLORS = ["#2563eb", "#16a34a", "#7c3aed", "#f97316"];

const formatValue = (value: number, format: HpcLabLineChartModel["valueFormat"]) => {
  if (format === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (format === "gbps") {
    return `${value.toFixed(2)} Gbps`;
  }
  if (format === "ops") {
    return `${value.toFixed(0)} ops`;
  }
  if (format === "count") {
    return `${value.toFixed(0)}`;
  }
  return `${value.toFixed(2)}`;
};

const buildPath = (points: Array<{ x: number; y: number }>): string =>
  points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

export function MultiSeriesLineChart({ model }: { model: HpcLabLineChartModel }) {
  const width = 640;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 28, left: 44 };

  const allValues = model.series.flatMap((series) => series.points.map((point) => point.value));
  const yMax = Math.max(1, ...allValues);
  const yMin = 0;
  const pointsCount = Math.max(1, model.series[0]?.points.length ?? 1);

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
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label={model.title}>
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
          return <path key={series.key} d={buildPath(coordinates)} fill="none" stroke={COLORS[seriesIndex]} strokeWidth={2} />;
        })}

        <text x={padding.left} y={height - 6} className="fill-foreground/70 text-[10px]">Tick</text>
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {model.series.map((series, seriesIndex) => (
          <span key={series.key} className="inline-flex items-center gap-1 text-foreground/80">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[seriesIndex] }} aria-hidden />
            {series.label}
          </span>
        ))}
      </div>
    </div>
  );
}
