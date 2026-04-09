"use client";

import { useId, useState, type ReactNode } from "react";

type InfoTooltipProps = {
  label: string;
  title?: string;
  body: ReactNode;
  className?: string;
  triggerClassName?: string;
};

export function InfoTooltip({ label, title, body, className, triggerClassName }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className={["relative inline-flex items-center", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className={[
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border/70 px-1 text-[11px] font-semibold text-foreground/65 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={label}
        aria-describedby={tooltipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={[
          "pointer-events-none absolute left-0 top-[calc(100%+0.35rem)] z-20 w-72 max-w-[min(19rem,85vw)] rounded-md border border-border/80 bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-md transition sm:w-80",
          open ? "visible opacity-100" : "invisible opacity-0",
        ].join(" ")}
      >
        {title ? <span className="mb-1 block font-semibold">{title}</span> : null}
        <span>{body}</span>
      </span>
    </span>
  );
}
