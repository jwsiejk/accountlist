"use client";

import { useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";

import { AI_VERDICT_STYLES, INPUT_BASE_CLASSES, REVIEW_LIST_HEIGHT, REVIEW_ROW_HEIGHT } from "./constants";
import { VirtualizedList } from "./VirtualizedList";
import type { AiResult, AiReviewItem, AiReviewMode, AiVerdict, ReviewRow } from "./types";

const AiReviewModal = ({
  open,
  mode,
  setMode,
  limit,
  setLimit,
  isRunning,
  progress,
  targetCount,
  runItems,
  results,
  rowById,
  onRun,
  onStop,
  onClose,
  onConfirm,
  onReject,
}: {
  open: boolean;
  mode: AiReviewMode;
  setMode: (next: AiReviewMode) => void;
  limit: number;
  setLimit: (next: number) => void;
  isRunning: boolean;
  progress: { done: number; total: number };
  targetCount: number;
  runItems: AiReviewItem[];
  results: Record<string, AiResult>;
  rowById: Map<string, ReviewRow>;
  onRun: () => void;
  onStop: () => void;
  onClose: () => void;
  onConfirm: (row: ReviewRow) => void;
  onReject: (row: ReviewRow) => void;
}) => {
  const itemsWithResults = useMemo(
    () => runItems.filter((item) => Boolean(results[item.key])),
    [results, runItems],
  );

  const summary = useMemo(() => {
    let match = 0;
    let noMatch = 0;
    let unsure = 0;
    let error = 0;
    itemsWithResults.forEach((item) => {
      const result = results[item.key];
      if (!result) {
        return;
      }
      if (result.error) {
        error += 1;
        return;
      }
      if (result.verdict === "match") {
        match += 1;
        return;
      }
      if (result.verdict === "no_match") {
        noMatch += 1;
        return;
      }
      unsure += 1;
    });
    return { match, noMatch, unsure, error, total: itemsWithResults.length };
  }, [itemsWithResults, results]);

  const itemsForVerdict = useCallback(
    (verdict: AiVerdict | "error") => {
      return itemsWithResults
        .filter((item) => {
          const result = results[item.key];
          if (!result) {
            return false;
          }
          if (verdict === "error") {
            return Boolean(result.error);
          }
          return result.verdict === verdict && !result.error;
        })
        .map((item) => {
          const row = rowById.get(item.rowId);
          const result = results[item.key];
          return row && result ? { item, row, result } : null;
        })
        .filter(
          (value): value is { item: AiReviewItem; row: ReviewRow; result: AiResult } =>
            value !== null,
        );
    },
    [itemsWithResults, results, rowById],
  );

  const matchItems = useMemo(() => itemsForVerdict("match"), [itemsForVerdict]);
  const noMatchItems = useMemo(() => itemsForVerdict("no_match"), [itemsForVerdict]);
  const errorItems = useMemo(() => itemsForVerdict("error"), [itemsForVerdict]);

  const shouldShowMatch = mode === "review";
  const shouldShowNoMatch = noMatchItems.length > 0;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10">
      <div
        className="w-full max-w-4xl rounded-xl border border-foreground/10 bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-review-title"
      >
        <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-foreground/50">AI Review</p>
            <p className="text-base font-semibold" id="ai-review-title">
              Get a second opinion from your local Ollama model
            </p>
            <p className="text-xs text-foreground/60">
              AI never auto-applies decisions. It suggests, you confirm.
            </p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              className={`rounded-xl border px-4 py-4 text-left shadow-sm transition hover:bg-muted/40 ${
                mode === "review"
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-foreground/10"
              }`}
              onClick={() => setMode("review")}
              disabled={isRunning}
            >
              <p className="text-sm font-semibold">Review list</p>
              <p className="mt-1 text-xs text-foreground/60">
                Classifies review candidates as Match / No match, then you confirm.
              </p>
            </button>
            <button
              type="button"
              className={`rounded-xl border px-4 py-4 text-left shadow-sm transition hover:bg-muted/40 ${
                mode === "validateMatched"
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-foreground/10"
              }`}
              onClick={() => setMode("validateMatched")}
              disabled={isRunning}
            >
              <p className="text-sm font-semibold">Validate matched</p>
              <p className="mt-1 text-xs text-foreground/60">
                Double-checks already matched pairs and flags suspicious ones.
              </p>
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-foreground/10 bg-muted/30 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Run settings</p>
              <p className="text-xs text-foreground/60">
                Target list size: {targetCount.toLocaleString()} • Reviewing up to {Math.min(
                  limit,
                  targetCount,
                ).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="ai-review-limit">
                  Max items
                </label>
                <input
                  id="ai-review-limit"
                  type="number"
                  min={1}
                  max={500}
                  className={`w-28 ${INPUT_BASE_CLASSES}`}
                  value={limit}
                  onChange={(event) => setLimit(Math.max(1, Math.min(500, Number(event.target.value) || 1)))}
                  disabled={isRunning}
                />
              </div>
              {isRunning ? (
                <Button variant="secondary" onClick={onStop}>
                  Stop
                </Button>
              ) : (
                <Button onClick={onRun} disabled={targetCount === 0}>
                  Run AI Review
                </Button>
              )}
            </div>
          </div>

          {isRunning || progress.total > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-foreground/60">
                <span>
                  Reviewed {progress.done.toLocaleString()} of {progress.total.toLocaleString()}
                </span>
                <span>{progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {runItems.length === 0 ? (
            <p className="text-sm text-foreground/60">
              Choose a mode, then click <span className="font-semibold">Run AI Review</span>.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                <span className="font-semibold text-foreground">Results</span>
                <span>• Match {summary.match}</span>
                <span>• No match {summary.noMatch}</span>
                <span>• Unsure {summary.unsure}</span>
                {summary.error ? <span>• Errors {summary.error}</span> : null}
              </div>

              {errorItems.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  <p className="font-semibold">AI Review errors</p>
                  <p className="mt-1 text-xs">
                    Could not reach Ollama for some items. Make sure Ollama is running on the same machine as this app.
                  </p>
                </div>
              ) : null}

              {shouldShowMatch ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">AI suggests: Match ({matchItems.length})</p>
                  {matchItems.length === 0 ? (
                    <p className="text-xs text-foreground/60">No AI match suggestions in this batch.</p>
                  ) : (
                    <ul className="divide-y divide-foreground/10 overflow-hidden rounded-lg border border-foreground/10">
                      {matchItems.slice(0, 50).map(({ item, row, result }) => {
                        const partner = row.partner;
                        if (!partner) {
                          return null;
                        }
                        return (
                          <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-[240px] flex-1">
                              <p className="text-sm font-semibold">{row.vendor.rawName || "Unnamed account"}</p>
                              <p className="text-xs text-foreground/60">↔ {partner.rawName || "Unnamed account"}</p>
                              {result.reason ? (
                                <p className="mt-1 text-xs text-foreground/50 truncate">{result.reason}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border border-foreground/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                  AI_VERDICT_STYLES[result.verdict]
                                }`}
                              >
                                Match {result.confidence}
                              </span>
                              <Button size="sm" onClick={() => onConfirm(row)}>
                                Confirm
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {matchItems.length > 50 ? (
                    <p className="text-xs text-foreground/60">Showing first 50 results.</p>
                  ) : null}
                </div>
              ) : null}

              {shouldShowNoMatch ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">
                    AI suggests: No match ({noMatchItems.length})
                  </p>
                  <ul className="divide-y divide-foreground/10 overflow-hidden rounded-lg border border-foreground/10">
                    {noMatchItems.slice(0, 50).map(({ item, row, result }) => {
                      const partner = row.partner;
                      if (!partner) {
                        return null;
                      }
                      return (
                        <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-[240px] flex-1">
                            <p className="text-sm font-semibold">{row.vendor.rawName || "Unnamed account"}</p>
                            <p className="text-xs text-foreground/60">↔ {partner.rawName || "Unnamed account"}</p>
                            {result.reason ? (
                              <p className="mt-1 text-xs text-foreground/50 truncate">{result.reason}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border border-foreground/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                AI_VERDICT_STYLES[result.verdict]
                              }`}
                            >
                              No match {result.confidence}
                            </span>
                            <Button size="sm" variant="secondary" onClick={() => onReject(row)}>
                              Reject
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {noMatchItems.length > 50 ? (
                    <p className="text-xs text-foreground/60">Showing first 50 results.</p>
                  ) : null}
                </div>
              ) : null}

              {summary.unsure ? (
                <p className="text-xs text-foreground/60">
                  Unsure results stay in Manual Review.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { AiReviewModal };
