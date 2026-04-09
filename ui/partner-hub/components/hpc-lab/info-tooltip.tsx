"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type InfoTooltipProps = {
  label: string;
  title?: string;
  body: ReactNode;
  className?: string;
  triggerClassName?: string;
};

type FloatingPosition = { top: number; left: number };

const VIEWPORT_MARGIN = 12;
const GAP = 10;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getTooltipPosition = (triggerRect: DOMRect, tooltipRect: DOMRect): FloatingPosition => {
  const placements: FloatingPosition[] = [
    {
      top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      left: triggerRect.right + GAP,
    },
    {
      top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      left: triggerRect.left - tooltipRect.width - GAP,
    },
    {
      top: triggerRect.top - tooltipRect.height - GAP,
      left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
    },
    {
      top: triggerRect.bottom + GAP,
      left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
    },
  ];

  const fits = (position: FloatingPosition) =>
    position.left >= VIEWPORT_MARGIN &&
    position.top >= VIEWPORT_MARGIN &&
    position.left + tooltipRect.width <= window.innerWidth - VIEWPORT_MARGIN &&
    position.top + tooltipRect.height <= window.innerHeight - VIEWPORT_MARGIN;

  const chosen = placements.find(fits) ?? placements[0];
  return {
    top: clamp(chosen.top, VIEWPORT_MARGIN, window.innerHeight - tooltipRect.height - VIEWPORT_MARGIN),
    left: clamp(chosen.left, VIEWPORT_MARGIN, window.innerWidth - tooltipRect.width - VIEWPORT_MARGIN),
  };
};

export function InfoTooltip({ label, title, body, className, triggerClassName }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) {
        return;
      }
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      setPosition(getTooltipPosition(triggerRect, tooltipRect));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <span className={["inline-flex items-center", className].filter(Boolean).join(" ")}>
      <button
        ref={triggerRef}
        type="button"
        className={[
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border/70 px-1 text-[11px] font-semibold text-foreground/65 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open
        ? createPortal(
            <span
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none fixed z-[120] w-[min(320px,calc(100vw-24px))] rounded-md border border-border/80 bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-md"
              style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999 }}
            >
              {title ? <span className="mb-1 block font-semibold">{title}</span> : null}
              <span className="whitespace-normal break-words">{body}</span>
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
