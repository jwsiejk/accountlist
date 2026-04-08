import type { ReactNode } from "react";

type ChartFrameProps = {
  title: string;
  subtitle?: string;
  stale?: boolean;
  emptyMessage: string;
  children: ReactNode | null;
  note?: string;
};

export function ChartFrame({ title, subtitle, stale = false, emptyMessage, children, note }: ChartFrameProps) {
  const hasContent = children !== null;

  return (
    <section className="space-y-2" aria-label={title}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-foreground/65">{subtitle}</p> : null}
        {stale ? <p className="text-xs text-amber-700">Showing last run result (stale).</p> : null}
      </div>
      {hasContent ? children : <p className="text-sm text-foreground/70">{emptyMessage}</p>}
      {note ? <p className="text-xs text-foreground/65">{note}</p> : null}
    </section>
  );
}
