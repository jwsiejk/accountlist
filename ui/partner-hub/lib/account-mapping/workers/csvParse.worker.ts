import Papa from "papaparse";

type CsvParseMessage = {
  file: File;
  options?: {
    previewRows?: number;
    progressStep?: number;
  };
};

type CsvParseProgress = {
  type: "progress";
  rowCount: number;
  cursor: number;
};

type CsvParseComplete = {
  type: "complete";
  headers: string[];
  sampleRows: Record<string, string>[];
  rows: Record<string, string>[];
  rowCount: number;
  inferredDelimiter: string;
  parseWarnings?: string[];
};

type CsvParseError = {
  type: "error";
  message: string;
};

const ctx: any = self;

ctx.onmessage = (event: MessageEvent<CsvParseMessage>) => {
  const { file, options } = event.data;
  const previewRows = options?.previewRows ?? 50;
  const progressStep = options?.progressStep ?? 2000;

  let headers: string[] = [];
  const sampleRows: Record<string, string>[] = [];
  const rows: Record<string, string>[] = [];
  let rowCount = 0;
  let lastProgress = 0;
  const parseWarnings: string[] = [];

  Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    chunkSize: 1024 * 64,
    chunk: (results) => {
      if (!headers.length && results.meta.fields) {
        headers = results.meta.fields;
      }

      rowCount += results.data.length;
      if (results.data.length) {
        rows.push(...results.data);
      }

      if (results.errors.length) {
        results.errors.forEach((error) => {
          parseWarnings.push(`${error.type}: ${error.message}`);
        });
      }

      for (const row of results.data) {
        if (sampleRows.length < previewRows) {
          sampleRows.push(row);
        } else {
          break;
        }
      }

      if (rowCount - lastProgress >= progressStep) {
        lastProgress = rowCount;
        ctx.postMessage({
          type: "progress",
          rowCount,
          cursor: results.meta.cursor,
        } satisfies CsvParseProgress);
      }
    },
    complete: (results) => {
      if (!headers.length && results.meta.fields) {
        headers = results.meta.fields;
      }

      if (results.errors.length) {
        results.errors.forEach((error) => {
          parseWarnings.push(`${error.type}: ${error.message}`);
        });
      }

      ctx.postMessage({
        type: "complete",
        headers,
        sampleRows,
        rows,
        rowCount,
        inferredDelimiter: results.meta.delimiter ?? ",",
        parseWarnings: parseWarnings.length ? parseWarnings : undefined,
      } satisfies CsvParseComplete);
    },
    error: (error) => {
      ctx.postMessage({
        type: "error",
        message: error?.message ?? "Unable to parse CSV file.",
      } satisfies CsvParseError);
    },
  });
};

export {};
