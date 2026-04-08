import type { HpcLabBarChartModel } from "@/lib/hpc-lab/types";

const formatValue = (value: number, format: HpcLabBarChartModel["valueFormat"]) => {
  if (format === "gbps") {
    return `${value.toFixed(2)} Gbps`;
  }
  if (format === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(2);
};

export function BarDistributionChart({ model }: { model: HpcLabBarChartModel }) {
  const bars = model.bars;
  if (bars.length === 0) {
    return <p className="text-sm text-foreground/70">No distribution data available.</p>;
  }

  const width = 640;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 30, left: 44 };
  const yMax = Math.max(1, ...bars.map((bar) => bar.value));
  const chartWidth = width - padding.left - padding.right;
  const barWidth = chartWidth / bars.length;

  const toY = (value: number) => {
    const span = height - padding.top - padding.bottom;
    return height - padding.bottom - (value / yMax) * span;
  };

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full text-sky-600 dark:text-sky-400"
        role="img"
        aria-label={model.title}
      >
        {bars.map((bar, index) => {
          const x = padding.left + index * barWidth;
          const y = toY(bar.value);
          const h = height - padding.bottom - y;
          return <rect key={bar.label} x={x} y={y} width={Math.max(1, barWidth - 1)} height={h} fill="currentColor" opacity={0.85} />;
        })}
        <text x={6} y={16} className="fill-foreground/70 text-[10px]">
          max {formatValue(yMax, model.valueFormat)}
        </text>
      </svg>
      <p className="text-xs text-foreground/65">{bars.length} OSTs aggregated as average delivered load.</p>
    </div>
  );
}
