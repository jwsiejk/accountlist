"use client";

import { useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { bytesToLabel } from "./utils";
import type { CsvParseState } from "./types";

const FileDropzone = ({
  label,
  description,
  parseState,
  onFileSelected,
}: {
  label: string;
  description: string;
  parseState: CsvParseState;
  onFileSelected: (file: File) => void;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    onFileSelected(files[0]);
  };

  const progressPercent = useMemo(() => {
    if (!parseState.file) {
      return 0;
    }
    if (parseState.progressBytes <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((parseState.progressBytes / parseState.file.size) * 100));
  }, [parseState.file, parseState.progressBytes]);

  return (
    <Card className="space-y-4 border border-dashed">
      <CardHeader className="gap-2">
        <CardTitle className="text-base">{label}</CardTitle>
        <p className="text-sm text-foreground/60">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-foreground/20 bg-muted/40 px-4 py-6 text-center"
          aria-label={`${label} file dropzone`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <p className="text-sm font-medium">Drop CSV here or browse</p>
          <Button
            variant="secondary"
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={`Browse ${label} CSV`}
          >
            Browse file
          </Button>
          <p className="text-xs text-foreground/60">Supports 70,000+ rows with worker parsing.</p>
        </div>

        {parseState.file && (
          <div className="space-y-2 rounded-lg border border-foreground/10 bg-background px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="font-medium">{parseState.file.name}</div>
              <div className="text-foreground/60">{bytesToLabel(parseState.file.size)}</div>
            </div>
            {parseState.status === "parsing" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-foreground/60">
                  <span>Parsing… {parseState.progressRows.toLocaleString()} rows</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
            {parseState.status === "ready" && parseState.result && (
              <div className="grid gap-2 text-xs text-foreground/60 md:grid-cols-2">
                <div>
                  Rows: {parseState.result.rowCount.toLocaleString()}
                </div>
                <div>Delimiter: {parseState.result.inferredDelimiter}</div>
                <div>Headers: {parseState.result.headers.length}</div>
                <div>Preview rows: {parseState.result.sampleRows.length}</div>
              </div>
            )}
            {parseState.status === "error" && (
              <p className="text-xs text-destructive" role="alert">
                {parseState.error}
              </p>
            )}
            {parseState.result?.parseWarnings?.length ? (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                <p className="font-semibold">Parsing warnings</p>
                <ul className="list-disc space-y-1 pl-4">
                  {parseState.result.parseWarnings.slice(0, 3).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { FileDropzone };
