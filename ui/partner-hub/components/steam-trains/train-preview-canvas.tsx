"use client";

import { useEffect, useRef } from "react";

import { renderTrainPreviewCard } from "@/lib/steam-trains/visuals";
import type { TrainDefinition } from "@/lib/steam-trains/types";

type TrainPreviewCanvasProps = {
  train: TrainDefinition;
  width: number;
  height: number;
  className?: string;
  animated?: boolean;
};

export function TrainPreviewCanvas({ train, width, height, className, animated = true }: TrainPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frame: number | null = null;
    const start = performance.now();

    const drawFrame = (timestamp: number) => {
      const elapsed = (timestamp - start) / 1000;
      const wheelRotation = elapsed * 1.6;
      renderTrainPreviewCard(context, train, width, height, wheelRotation);
      if (animated) {
        frame = window.requestAnimationFrame(drawFrame);
      }
    };

    if (animated) {
      frame = window.requestAnimationFrame(drawFrame);
    } else {
      drawFrame(start);
    }

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [animated, height, train, width]);

  return <canvas ref={canvasRef} width={width} height={height} className={className} aria-label={train.displayName} role="img" />;
}
