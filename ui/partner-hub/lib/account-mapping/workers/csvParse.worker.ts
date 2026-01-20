/// <reference lib="webworker" />

import Papa from "papaparse";

type CsvParseOptions = {
  previewRows?: number;
  progressStep?: number;
};

type CsvParseRequest = {
  file: File;
  options?: CsvParseOptions;
};

type ProgressMessage = { type: "progress"; rowCount: number; cursor: number };
type ErrorMessage = { type: "error"; message: string };
type CompleteMessage = {
  type: "complete";
  headers: string[];
  sampleRows: Record<string, string>[];
  rows: Record<string, string>[];
  rowCount: number;
  inferredDelimiter: string;
  parseWarnings?: string[];
};

const post = (message: ProgressMessage | ErrorMessage | CompleteMessage) => {
  self.postMessage(message);
};

const countNewlines = (text: string) => {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) count += 1; // "\n"
  }
  return count;
};

self.onmessage = async (event: MessageEvent<CsvParseRequest>) => {
  try {
    const { file, options } = event.data || ({} as CsvParseRequest);
    if (!file) {
      post({ type: "error", message: "No file provided to CSV parser." });
      return;
    }

    const previewRows = Math.max(0, options?.previewRows ?? 50);
    const progressStep = Math.max(1, options?.progressStep ?? 250);

    const text = await file.text();
    const newlineCount = countNewlines(text);
    // Rough estimate: header line + data lines
    const estimatedDataRows = Math.max(1, newlineCount);

    const rows: Record<string, string>[] = [];
    const sampleRows: Record<string, string>[] = [];
    const warnings: string[] = [];

    let headers: string[] = [];
    let inferredDelimiter = ",";
    let lastProgressRow = 0;

    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      step: (stepResults) => {
        const raw = (stepResults.data || {}) as Record<string, unknown>;
        const row: Record<string, string> = {};
        for (const [key, value] of Object.entries(raw)) {
          row[key] = value == null ? "" : String(value);
        }

        rows.push(row);
        if (sampleRows.length < previewRows) sampleRows.push(row);

        if (!headers.length && stepResults.meta?.fields?.length) {
          headers = [...stepResults.meta.fields];
        }
        if (stepResults.meta?.delimiter) {
          inferredDelimiter = stepResults.meta.delimiter;
        }

        if (stepResults.errors?.length) {
          for (const err of stepResults.errors) {
            const rowInfo = typeof err.row === "number" ? ` row ${err.row}` : "";
            warnings.push(`${err.type}${rowInfo}: ${err.message}`);
          }
        }

        const rowCount = rows.length;
        if (rowCount - lastProgressRow >= progressStep) {
          lastProgressRow = rowCount;
          const cursor = Math.min(
            file.size,
            Math.round((rowCount / estimatedDataRows) * file.size),
          );
          post({ type: "progress", rowCount, cursor });
        }
      },
      complete: (finalResults) => {
        if (!headers.length && finalResults.meta?.fields?.length) {
          headers = [...finalResults.meta.fields];
        }
        if (finalResults.meta?.delimiter) {
          inferredDelimiter = finalResults.meta.delimiter;
        }
        if (finalResults.errors?.length) {
          for (const err of finalResults.errors) {
            const rowInfo = typeof err.row === "number" ? ` row ${err.row}` : "";
            warnings.push(`${err.type}${rowInfo}: ${err.message}`);
          }
        }

        const rowCount = rows.length;
        post({
          type: "complete",
          headers,
          sampleRows,
          rows,
          rowCount,
          inferredDelimiter,
          parseWarnings: warnings.length ? warnings : undefined,
        });
      },
      error: (err) => {
        post({
          type: "error",
          message: err?.message || "CSV parser failed unexpectedly.",
        });
      },
    });
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : "CSV parser crashed.",
    });
  }
};
