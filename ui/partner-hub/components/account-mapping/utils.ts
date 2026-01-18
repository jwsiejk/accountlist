import type { CsvValue } from "@/lib/account-mapping/csv";
import type { RawAccountMapping } from "@/lib/account-mapping/schema";
import type { StoredCsvSnapshot } from "@/lib/account-mapping/runHistory";

import type { CsvParseState } from "./types";

export const bytesToLabel = (value: number) => {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatMs = (value: number) => (value > 0 ? `${Math.round(value)} ms` : "—");

export const isMappingEmpty = (mapping: RawAccountMapping) =>
  Object.values(mapping).every((value) => !value);

export const buildCsvRows = <T extends Record<string, CsvValue>>(
  headers: readonly string[],
  rows: T[],
) => rows.map((row) => headers.map((header) => row[header] ?? ""));

export const buildCsvSnapshot = (state: CsvParseState): StoredCsvSnapshot => ({
  headers: state.result?.headers ?? [],
  rows: state.result?.rows ?? [],
  rowCount: state.result?.rowCount ?? 0,
  inferredDelimiter: state.result?.inferredDelimiter ?? ",",
});

export const buildRunId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `run-${Date.now()}`;
