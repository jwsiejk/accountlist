import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import CsvParseWorker from "@/lib/account-mapping/workers/csvParse.worker";

import { DEFAULT_PROGRESS_STEP } from "../constants";
import type { CsvParseResult, CsvParseState } from "../types";

type WorkerMessage =
  | { type: "progress"; rowCount: number; cursor: number }
  | (CsvParseResult & { type: "complete" })
  | { type: "error"; message: string };

export type RunStats = {
  vendorParseMs: number;
  partnerParseMs: number;
  matchMs: number;
  totalMs: number;
};

type CsvWorkerKind = "vendor" | "partner";

type CsvWorkerOptions = {
  setRunStats: Dispatch<SetStateAction<RunStats>>;
};

const buildWorker = () => new CsvParseWorker();

export const useCsvParseWorkers = ({ setRunStats }: CsvWorkerOptions) => {
  const vendorWorkerRef = useRef<Worker | null>(null);
  const partnerWorkerRef = useRef<Worker | null>(null);
  const mergedSearchWorkerRef = useRef<Worker | null>(null);
  const vendorParseStartRef = useRef<number | null>(null);
  const partnerParseStartRef = useRef<number | null>(null);
  const runStartRef = useRef<number | null>(null);

  const resetRunTracking = useCallback(() => {
    runStartRef.current = null;
    vendorParseStartRef.current = null;
    partnerParseStartRef.current = null;
    setRunStats({
      vendorParseMs: 0,
      partnerParseMs: 0,
      matchMs: 0,
      totalMs: 0,
    });
  }, [setRunStats]);

  const parseCsvFile = useCallback(
    (
      file: File,
      setState: Dispatch<SetStateAction<CsvParseState>>,
      workerRef: MutableRefObject<Worker | null>,
      kind: CsvWorkerKind,
    ) => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      const worker = buildWorker();
      workerRef.current = worker;

      const startTime = performance.now();
      if (!runStartRef.current) {
        runStartRef.current = startTime;
      }
      if (kind === "vendor") {
        vendorParseStartRef.current = startTime;
      } else {
        partnerParseStartRef.current = startTime;
      }

      setState({
        file,
        status: "parsing",
        progressRows: 0,
        progressBytes: 0,
        result: null,
      });

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const data = event.data;
        if (data.type === "progress") {
          setState((prev) => ({
            ...prev,
            progressRows: data.rowCount,
            progressBytes: data.cursor,
          }));
          return;
        }

        if (data.type === "complete") {
          const endTime = performance.now();
          const duration =
            kind === "vendor"
              ? vendorParseStartRef.current
                ? endTime - vendorParseStartRef.current
                : 0
              : partnerParseStartRef.current
                ? endTime - partnerParseStartRef.current
                : 0;
          setRunStats((prev) => ({
            ...prev,
            vendorParseMs: kind === "vendor" ? duration : prev.vendorParseMs,
            partnerParseMs: kind === "partner" ? duration : prev.partnerParseMs,
            totalMs: runStartRef.current ? endTime - runStartRef.current : prev.totalMs,
          }));
          setState({
            file,
            status: "ready",
            progressRows: data.rowCount,
            progressBytes: file.size,
            result: {
              headers: data.headers,
              sampleRows: data.sampleRows,
              rows: data.rows,
              rowCount: data.rowCount,
              inferredDelimiter: data.inferredDelimiter,
              parseWarnings: data.parseWarnings,
            },
          });
          worker.terminate();
          workerRef.current = null;
        }

        if (data.type === "error") {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: data.message,
          }));
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.postMessage({
        file,
        options: {
          previewRows: 50,
          progressStep: DEFAULT_PROGRESS_STEP,
        },
      });
    },
    [setRunStats],
  );

  const parseSearchCsvFile = useCallback(
    (file: File, setState: Dispatch<SetStateAction<CsvParseState>>) => {
      if (mergedSearchWorkerRef.current) {
        mergedSearchWorkerRef.current.terminate();
      }

      const worker = buildWorker();
      mergedSearchWorkerRef.current = worker;

      setState({
        file,
        status: "parsing",
        progressRows: 0,
        progressBytes: 0,
        result: null,
      });

      const handleWorkerError = (message: string) => {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: message,
        }));
        worker.terminate();
        mergedSearchWorkerRef.current = null;
      };

      worker.onerror = (event) => {
        handleWorkerError(event.message || "CSV parser crashed while processing the upload.");
      };

      worker.onmessageerror = () => {
        handleWorkerError("CSV parser encountered an unexpected message error.");
      };

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const data = event.data;
        if (data.type === "progress") {
          setState((prev) => ({
            ...prev,
            progressRows: data.rowCount,
            progressBytes: data.cursor,
          }));
          return;
        }

        if (data.type === "complete") {
          setState({
            file,
            status: "ready",
            progressRows: data.rowCount,
            progressBytes: file.size,
            result: {
              headers: data.headers,
              sampleRows: data.sampleRows,
              rows: data.rows,
              rowCount: data.rowCount,
              inferredDelimiter: data.inferredDelimiter,
              parseWarnings: data.parseWarnings,
            },
          });
          worker.terminate();
          mergedSearchWorkerRef.current = null;
        }

        if (data.type === "error") {
          handleWorkerError(data.message);
        }
      };

      worker.postMessage({
        file,
        options: {
          previewRows: 50,
          progressStep: DEFAULT_PROGRESS_STEP,
        },
      });
    },
    [],
  );

  useEffect(() => {
    const vendorWorker = vendorWorkerRef.current;
    const partnerWorker = partnerWorkerRef.current;
    const mergedSearchWorker = mergedSearchWorkerRef.current;

    return () => {
      vendorWorker?.terminate();
      partnerWorker?.terminate();
      mergedSearchWorker?.terminate();
    };
  }, []);

  return {
    parseVendorCsv: (file: File, setState: Dispatch<SetStateAction<CsvParseState>>) =>
      parseCsvFile(file, setState, vendorWorkerRef, "vendor"),
    parsePartnerCsv: (file: File, setState: Dispatch<SetStateAction<CsvParseState>>) =>
      parseCsvFile(file, setState, partnerWorkerRef, "partner"),
    parseMergedSearchCsv: parseSearchCsvFile,
    resetRunTracking,
    runStartRef,
  };
};
