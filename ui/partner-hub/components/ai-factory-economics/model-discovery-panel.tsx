"use client";

import { Boxes, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withBasePath } from "@/lib/basePath";
import type { AiFactoryModelDiscoveryResult } from "@/lib/ai-factory-economics/types";
import { MetricLabel } from "./metric-label";

type LoadState = "idle" | "loading" | "ready" | "error";

export function ModelDiscoveryPanel() {
  const [result, setResult] = useState<AiFactoryModelDiscoveryResult | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [uiError, setUiError] = useState("");

  const refresh = useCallback(async () => {
    setLoadState("loading");
    setUiError("");

    try {
      const response = await fetch(withBasePath("/api/ai-factory-economics/models"), {
        cache: "no-store",
      });
      const data = (await response.json()) as AiFactoryModelDiscoveryResult;
      setResult(data);
      setLoadState("ready");
    } catch {
      setResult(null);
      setUiError("Could not load the model discovery endpoint. Demo/mock dashboard values remain available.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const models = result?.ok ? result.models : [];
  const hasModels = models.length > 0;

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">Measured local models</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl">
              <Boxes className="h-5 w-5 text-primary" aria-hidden />
              Ollama model discovery
            </CardTitle>
          </div>
          <MetricLabel classification="Measured" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/70">
        {loadState === "loading" ? <p>Discovering local Ollama models…</p> : null}
        {uiError ? <p className="text-amber-700 dark:text-amber-300">{uiError}</p> : null}
        {!result?.ok && result?.error ? (
          <p className="text-amber-700 dark:text-amber-300">{result.error.message}</p>
        ) : null}

        {hasModels ? (
          <div className="space-y-2">
            <p>
              Found {models.length} local model{models.length === 1 ? "" : "s"}. This read-only list is measured from
              Ollama <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/tags</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              {models.map((model) => (
                <span key={model} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground">
                  {model}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <p className="font-semibold text-foreground">No local models discovered.</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Start Ollama.</li>
              <li>
                Pull a model with <code className="rounded bg-background px-1 py-0.5 text-xs">ollama pull &lt;model&gt;</code>.
              </li>
              <li>Refresh this page or status panel.</li>
            </ul>
          </div>
        )}

        <p>
          Any fallback or dashboard model names elsewhere on this page remain labeled <strong>Demo/mock</strong>; discovered
          local models are labeled <strong>Measured</strong>.
        </p>

        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadState === "loading"}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh models
        </button>
      </CardContent>
    </Card>
  );
}
