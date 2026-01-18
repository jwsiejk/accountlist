"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AiResult, AiReviewItem, AiReviewMode, AiVerdict, ReviewRow } from "../types";

type BuildDecisionKey = (vendorAccountKey: string, partnerAccountKey: string, normalizedName: string) => string;

const filterAiReviewRows = (reviewRows: ReviewRow[]) =>
  reviewRows
    .filter((row) => row.baseStatus === "review")
    .filter((row) => row.status === "review")
    .filter((row) => row.partner !== null);

const filterAiValidateMatchedRows = (reviewRows: ReviewRow[]) =>
  reviewRows
    .filter((row) => row.partner !== null)
    .filter((row) => Boolean(row.partnerAccountKey))
    .filter((row) => ["autoMatch", "confirmed", "manual"].includes(row.status));

const buildAiKey = (row: ReviewRow, buildDecisionKey: BuildDecisionKey) => {
  const partnerKey = row.partnerAccountKey ?? row.partner?.accountKey ?? "";
  return buildDecisionKey(row.vendorAccountKey, partnerKey, row.normalizedName);
};

type UseAiReviewOptions = {
  reviewRows: ReviewRow[];
  buildDecisionKey: BuildDecisionKey;
};

export const useAiReview = ({ reviewRows, buildDecisionKey }: UseAiReviewOptions) => {
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReviewMode, setAiReviewMode] = useState<AiReviewMode>("review");
  const [aiReviewLimit, setAiReviewLimit] = useState(50);
  const [aiReviewRunning, setAiReviewRunning] = useState(false);
  const [aiReviewProgress, setAiReviewProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [aiReviewRunItems, setAiReviewRunItems] = useState<AiReviewItem[]>([]);
  const [aiReviewResults, setAiReviewResults] = useState<Record<string, AiResult>>({});
  const aiReviewCancelRef = useRef(false);

  useEffect(() => () => {
    aiReviewCancelRef.current = true;
  }, []);

  const aiReviewRows = useMemo(() => filterAiReviewRows(reviewRows), [reviewRows]);
  const aiValidateMatchedRows = useMemo(() => filterAiValidateMatchedRows(reviewRows), [reviewRows]);
  const aiTargetRows = aiReviewMode === "review" ? aiReviewRows : aiValidateMatchedRows;
  const aiTargetCount = aiTargetRows.length;

  const buildKeyForRow = useCallback(
    (row: ReviewRow) => buildAiKey(row, buildDecisionKey),
    [buildDecisionKey],
  );

  const stopAiReview = useCallback(() => {
    aiReviewCancelRef.current = true;
  }, []);

  const runAiReview = useCallback(async () => {
    const target = aiTargetRows.slice(0, Math.max(1, Math.min(500, aiReviewLimit)));
    const runItems = target.map((row) => ({ key: buildKeyForRow(row), rowId: row.id }));
    setAiReviewRunItems(runItems);
    setAiReviewProgress({ done: 0, total: runItems.length });
    aiReviewCancelRef.current = false;
    setAiReviewRunning(true);

    for (const row of target) {
      if (aiReviewCancelRef.current) {
        break;
      }

      const key = buildKeyForRow(row);
      const existing = aiReviewResults[key];
      if (existing && !existing.error) {
        setAiReviewProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        continue;
      }

      const partner = row.partner;
      if (!partner) {
        setAiReviewResults((prev) => ({
          ...prev,
          [key]: {
            verdict: "unsure",
            confidence: 0,
            error: "No partner selected for this row.",
          },
        }));
        setAiReviewProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        continue;
      }

      try {
        const resp = await fetch("/api/account-mapping/ai-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorName: row.vendor.rawName,
            partnerName: partner.rawName,
            vendorNormalized: row.vendor.normalizedName,
            partnerNormalized: partner.normalizedName,
          }),
        });

        const data = (await resp.json().catch(() => ({}))) as Partial<AiResult> & {
          error?: string;
          detail?: string;
        };

        if (!resp.ok) {
          const message = data.error || `Request failed (${resp.status})`;
          setAiReviewResults((prev) => ({
            ...prev,
            [key]: {
              verdict: "unsure",
              confidence: 0,
              error: message,
              reason: typeof data.detail === "string" ? data.detail : undefined,
            },
          }));
        } else {
          setAiReviewResults((prev) => ({
            ...prev,
            [key]: {
              verdict: (data.verdict as AiVerdict) || "unsure",
              confidence:
                typeof data.confidence === "number" ? data.confidence : Number(data.confidence) || 0,
              reason: typeof data.reason === "string" ? data.reason : undefined,
              model: typeof data.model === "string" ? data.model : undefined,
              latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : undefined,
            },
          }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setAiReviewResults((prev) => ({
          ...prev,
          [key]: {
            verdict: "unsure",
            confidence: 0,
            error: message,
          },
        }));
      }

      setAiReviewProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setAiReviewRunning(false);
  }, [aiReviewLimit, aiReviewResults, aiTargetRows, buildKeyForRow]);

  return {
    aiReviewOpen,
    setAiReviewOpen,
    aiReviewMode,
    setAiReviewMode,
    aiReviewLimit,
    setAiReviewLimit,
    aiReviewRunning,
    aiReviewProgress,
    aiReviewRunItems,
    aiReviewResults,
    aiTargetCount,
    runAiReview,
    stopAiReview,
  };
};
