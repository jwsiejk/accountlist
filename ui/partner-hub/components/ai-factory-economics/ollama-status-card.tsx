"use client";

import { RefreshCw, Server, ShieldCheck, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withBasePath } from "@/lib/basePath";
import type { AiFactoryHealthStatus } from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";

type LoadState = "idle" | "loading" | "ready" | "error";

export function OllamaStatusCard() {
  const [status, setStatus] = useState<AiFactoryHealthStatus | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [uiError, setUiError] = useState("");

  const refresh = useCallback(async () => {
    setLoadState("loading");
    setUiError("");

    try {
      const response = await fetch(withBasePath("/api/ai-factory-economics/health"), {
        cache: "no-store",
      });
      const data = (await response.json()) as AiFactoryHealthStatus;
      setStatus(data);
      setLoadState("ready");
    } catch {
      setStatus(null);
      setUiError("Could not load the local Ollama health endpoint. The page can continue in demo/mock mode.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isAvailable = status?.ollama.reachable === true;
  const baseUrl = status?.ollama.baseUrl ?? "http://127.0.0.1:11434";

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Measured local status</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl">
              {isAvailable ? <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden /> : <WifiOff className="h-5 w-5 text-amber-500" aria-hidden />}
              {isAvailable ? "Ollama ready" : "Ollama unavailable"}
            </CardTitle>
          </div>
          <MetricLabel classification="Measured" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/70">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Server className="h-4 w-4" aria-hidden />
            Configured local Ollama URL
          </div>
          <code className="mt-2 block break-all rounded-lg bg-background px-3 py-2 text-xs text-foreground">{baseUrl}</code>
          {status?.ollama.timeoutMs ? (
            <p className="mt-2 text-xs text-foreground/55">Health check timeout: {status.ollama.timeoutMs} ms.</p>
          ) : null}
        </div>

        {loadState === "loading" ? <p>Checking local Ollama health…</p> : null}
        {uiError ? <p className="text-amber-700 dark:text-amber-300">{uiError}</p> : null}
        {status?.ollama.error ? (
          <p className="text-amber-700 dark:text-amber-300">{status.ollama.error.message}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Demo mode</p>
            <p className="mt-1 font-semibold text-foreground">{status?.demoModeAvailable === false ? "Unavailable" : "Available"}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">NVIDIA telemetry</p>
            <p className="mt-1 font-semibold text-foreground">Not connected in Phase 2</p>
          </div>
        </div>

        <p>
          Phase 2 checks only health and local model discovery. It does not execute prompts, stream responses, calculate TTFT,
          calculate tokens/sec from real runs, or collect GPU telemetry.
        </p>

        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadState === "loading"}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh status
        </button>
      </CardContent>
    </Card>
  );
}
