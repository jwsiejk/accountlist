"use client";

import { useRef, useState, type ReactNode } from "react";

export const VirtualizedList = <T,>({
  items,
  rowHeight,
  height,
  renderRow,
}: {
  items: T[];
  rowHeight: number;
  height: number;
  renderRow: (item: T, index: number) => ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = () => {
    if (!containerRef.current) {
      return;
    }
    setScrollTop(containerRef.current.scrollTop);
  };

  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + 6);
  const offsetY = startIndex * rowHeight;
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg border border-foreground/10 bg-muted/20"
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => renderRow(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
};
