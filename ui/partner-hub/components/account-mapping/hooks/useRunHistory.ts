"use client";

import { useCallback, useEffect, useState } from "react";

import { loadRuns, type AccountMappingRun } from "@/lib/account-mapping/runHistory";

export const useRunHistory = () => {
  const [runHistory, setRunHistory] = useState<AccountMappingRun[]>([]);
  const [runHistoryStatus, setRunHistoryStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [runHistoryError, setRunHistoryError] = useState<string | null>(null);

  const refreshRunHistory = useCallback(() => {
    setRunHistoryStatus("loading");
    setRunHistoryError(null);
    loadRuns()
      .then((runs) => {
        setRunHistory(runs);
        setRunHistoryStatus("ready");
      })
      .catch((error: Error) => {
        setRunHistoryStatus("error");
        setRunHistoryError(error.message);
      });
  }, []);

  useEffect(() => {
    refreshRunHistory();
  }, [refreshRunHistory]);

  return {
    runHistory,
    runHistoryStatus,
    runHistoryError,
    refreshRunHistory,
    setRunHistoryStatus,
    setRunHistoryError,
  };
};
