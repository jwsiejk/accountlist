"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type InfoPopoverProps = {
  label: string;
  title: string;
  body: ReactNode;
  className?: string;
  triggerClassName?: string;
};

type FloatingPosition = { top: number; left: number };

const VIEWPORT_MARGIN = 12;
const GAP = 12;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getPopoverPosition = (triggerRect: DOMRect, popoverRect: DOMRect): FloatingPosition => {
  const placements: FloatingPosition[] = [
    {
      top: triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2,
      left: triggerRect.right + GAP,
    },
    {
      top: triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2,
      left: triggerRect.left - popoverRect.width - GAP,
    },
    {
      top: triggerRect.top - popoverRect.height - GAP,
      left: triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2,
    },
    {
      top: triggerRect.bottom + GAP,
      left: triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2,
    },
  ];

  const fits = (position: FloatingPosition) =>
    position.left >= VIEWPORT_MARGIN &&
    position.top >= VIEWPORT_MARGIN &&
    position.left + popoverRect.width <= window.innerWidth - VIEWPORT_MARGIN &&
    position.top + popoverRect.height <= window.innerHeight - VIEWPORT_MARGIN;

  const chosen = placements.find(fits) ?? placements[0];

  return {
    top: clamp(chosen.top, VIEWPORT_MARGIN, window.innerHeight - popoverRect.height - VIEWPORT_MARGIN),
    left: clamp(chosen.left, VIEWPORT_MARGIN, window.innerWidth - popoverRect.width - VIEWPORT_MARGIN),
  };
};

export function InfoPopover({ label, title, body, className, triggerClassName }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !popoverRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current || !popoverRef.current) {
        return;
      }
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      setPosition(getPopoverPosition(triggerRect, popoverRect));
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
        triggerRef.current?.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
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
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        i
      </button>
      {open
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              role="dialog"
              aria-label={title}
              className="fixed z-[130] w-[min(380px,calc(100vw-24px))] rounded-md border border-border/80 bg-popover px-3 py-3 text-left text-sm leading-relaxed text-popover-foreground shadow-lg"
              style={position ? { top: position.top, left: position.left } : { top: -9999, left: -9999 }}
            >
              <p className="mb-1 font-semibold">{title}</p>
              <p className="whitespace-normal break-words text-xs text-popover-foreground/90">{body}</p>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
