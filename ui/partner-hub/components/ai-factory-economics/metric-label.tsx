import { clsx } from "clsx";

import type { MetricClassification } from "@/lib/ai-factory-economics/types";

const labelClasses: Record<MetricClassification, string> = {
  Measured: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Estimated: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Derived: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  Configured: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  "Demo/mock": "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

type MetricLabelProps = {
  classification: MetricClassification;
  className?: string;
};

export function MetricLabel({ classification, className }: MetricLabelProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        labelClasses[classification],
        className,
      )}
    >
      {classification}
    </span>
  );
}
