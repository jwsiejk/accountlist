"use client";

import { Activity, RefreshCw, Thermometer, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withBasePath } from "@/lib/basePath";
import type { AiFactoryGpuTelemetryResult, AiFactoryGpuTelemetrySnapshot } from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";

type LoadState = "idle" | "loading" | "ready" | "error";

type TelemetryItem = {
  label: string;
  value: string;
  note: string;
};

function formatNumber(value: number | null, suffix = "") {
  return value === null ? "Unavailable" : `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}

function formatMemory(gpu: AiFactoryGpuTelemetrySnapshot) {
  const used = formatNumber(gpu.memoryUsedMb, " MB");
  const total = formatNumber(gpu.memoryTotalMb, " MB");
  return `${used} / ${total}`;
}

function telemetryItems(gpu: AiFactoryGpuTelemetrySnapshot): TelemetryItem[] {
  return [
    {
      label: "GPU index",
      value: gpu.index === null ? "Unavailable" : String(gpu.index),
      note: "Measured from the nvidia-smi index field when available.",
    },
    {
      label: "Utilization",
      value: formatNumber(gpu.utilizationGpuPercent, "%"),
      note: "Measured GPU utilization snapshot.",
    },
    {
      label: "Memory used / total",
      value: formatMemory(gpu),
      note: "Measured framebuffer memory snapshot.",
    },
    {
      label: "Power draw",
      value: formatNumber(gpu.powerDrawWatts, " W"),
      note: "Measured nvidia-smi power draw snapshot; not lab-grade wall power.",
    },
    {
      label: "Temperature",
      value: formatNumber(gpu.temperatureGpuCelsius, "°C"),
      note: "Measured GPU temperature snapshot.",
    },
  ];
}

export function GpuTelemetryPanel() {
  const [result, setResult] = useState<AiFactoryGpuTelemetryResult | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [uiError, setUiError] = useState("");

  const refresh = useCallback(async () => {
    setLoadState("loading");
    setUiError("");

    try {
      const response = await fetch(withBasePath("/api/ai-factory-economics/gpu"), {
        cache: "no-store",
      });
      const data = (await response.json()) as AiFactoryGpuTelemetryResult;
      setResult(data);
      setLoadState("ready");
    } catch {
      setResult(null);
      setUiError("Could not load the local NVIDIA telemetry endpoint. Prompt runner still works without GPU telemetry.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const defaultGpu = result?.ok ? result.gpus[0] : null;
  const items = defaultGpu ? telemetryItems(defaultGpu) : [];

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Measured local snapshot</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl">
              <Activity className="h-5 w-5 text-primary" aria-hidden />
              NVIDIA GPU telemetry
            </CardTitle>
          </div>
          <MetricLabel classification="Measured" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/70">
        {loadState === "loading" ? <p>Checking local NVIDIA telemetry…</p> : null}
        {uiError ? <p className="text-amber-700 dark:text-amber-300">{uiError}</p> : null}

        {result?.ok && defaultGpu ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Available
              </span>
              <span className="text-xs text-foreground/55">Sample timestamp: {defaultGpu.sampledAt}</span>
              {result.gpus.length > 1 ? <span className="text-xs text-foreground/55">Showing first/default snapshot from {result.gpus.length} GPUs.</span> : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-muted/25 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/55">{item.label}</p>
                    <MetricLabel classification="Measured" className="px-2 py-0.5 text-[10px]" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
                  <p className="mt-1 text-xs text-foreground/55">{item.note}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs">
              <p className="font-semibold text-foreground">Snapshot guardrails</p>
              <p className="mt-1">
                Phase 8 samples nvidia-smi only on refresh. It does not persist telemetry, does not create run history, does not
                attribute GPU power to a specific Ollama process, and does not claim lab-grade power measurement.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <p className="font-semibold text-foreground">NVIDIA telemetry unavailable.</p>
            {result?.error ? <p className="mt-2 text-amber-700 dark:text-amber-300">{result.error.message}</p> : null}
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>NVIDIA GPU/driver may not be available on this machine.</li>
              <li>
                <code className="rounded bg-background px-1 py-0.5 text-xs">nvidia-smi</code> may not be installed or in PATH.
              </li>
              <li>Telemetry is optional; the local prompt runner still works without it.</li>
              <li>Missing telemetry fields are shown as Unavailable, not zero.</li>
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loadState === "loading"}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh GPU telemetry
          </button>
          <span className="inline-flex items-center gap-1 text-xs text-foreground/55">
            <Zap className="h-3.5 w-3.5" aria-hidden /> Watts are nvidia-smi snapshots only.
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-foreground/55">
            <Thermometer className="h-3.5 w-3.5" aria-hidden /> Temperature is optional telemetry.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
