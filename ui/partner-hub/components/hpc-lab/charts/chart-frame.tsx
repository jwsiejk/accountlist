import type { ReactNode } from "react";

type ChartFrameProps = {
  title: string;
  showTitle?: boolean;
  subtitle?: string;
  stale?: boolean;
  emptyMessage: string;
  children: ReactNode | null;
  note?: string;
};

export function ChartFrame({ title, showTitle = true, subtitle, stale = false, emptyMessage, children, note }: ChartFrameProps) {
  const hasContent = children !== null;

  return (
    <section className="space-y-2 overflow-hidden" aria-label={title}>
      <div className="space-y-1">
        {showTitle ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
        {subtitle ? <p className="break-words text-xs text-foreground/65">{subtitle}</p> : null}
        {stale ? (
          <p className="break-words text-xs text-amber-700">
            Showing last run result (stale).
          </p>
        ) : null}
      </div>
      {hasContent ? children : <p className="break-words text-sm text-foreground/70">{emptyMessage}</p>}
      {note ? <p className="break-words text-xs text-foreground/65">{note}</p> : null}
    </section>
  );
}
