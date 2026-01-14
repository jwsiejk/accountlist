"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inferMappingFromHeaders } from "@/lib/account-mapping/inference";
import {
  canonicalFields,
  createEmptyRawMapping,
  normalizeMapping,
  validateMapping,
  type RawAccountMapping,
} from "@/lib/account-mapping/schema";
import {
  loadTemplates,
  saveTemplates,
  type MappingTemplate,
  TEMPLATE_STORAGE_KEY,
} from "@/lib/account-mapping/templateStorage";

const DEFAULT_PROGRESS_STEP = 2000;
const MAX_PREVIEW_ROWS = 20;

type CsvParseResult = {
  headers: string[];
  sampleRows: Record<string, string>[];
  rowCount: number;
  inferredDelimiter: string;
  parseWarnings?: string[];
};

type CsvParseState = {
  file: File | null;
  status: "idle" | "parsing" | "ready" | "error";
  progressRows: number;
  progressBytes: number;
  result: CsvParseResult | null;
  error?: string;
};

type WorkerMessage =
  | { type: "progress"; rowCount: number; cursor: number }
  | CsvParseResult & { type: "complete" }
  | { type: "error"; message: string };

const buildWorker = () =>
  new Worker(new URL("../../lib/account-mapping/workers/csvParse.worker.ts", import.meta.url), {
    type: "module",
  });

const bytesToLabel = (value: number) => {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const isMappingEmpty = (mapping: RawAccountMapping) =>
  Object.values(mapping).every((value) => !value);

const buildTemplateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `template-${Date.now()}`;

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
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
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
              <p className="text-xs text-destructive">{parseState.error}</p>
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

const PreviewTable = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: Record<string, string>[];
}) => (
  <div className="max-h-64 overflow-auto rounded-lg border border-foreground/10">
    <table className="min-w-full divide-y divide-foreground/10 text-xs">
      <thead className="sticky top-0 bg-background">
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="whitespace-nowrap px-3 py-2 text-left font-semibold text-foreground/70"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-foreground/10">
        {rows.map((row, index) => (
          <tr key={index}>
            {headers.map((header) => (
              <td key={header} className="whitespace-nowrap px-3 py-2 text-foreground/70">
                {row[header] ?? ""}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function AccountMappingTool() {
  const [vendorState, setVendorState] = useState<CsvParseState>({
    file: null,
    status: "idle",
    progressRows: 0,
    progressBytes: 0,
    result: null,
  });
  const [partnerState, setPartnerState] = useState<CsvParseState>({
    file: null,
    status: "idle",
    progressRows: 0,
    progressBytes: 0,
    result: null,
  });

  const [vendorMapping, setVendorMapping] = useState<RawAccountMapping>(createEmptyRawMapping());
  const [partnerMapping, setPartnerMapping] = useState<RawAccountMapping>(
    createEmptyRawMapping(),
  );

  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const vendorWorkerRef = useRef<Worker | null>(null);
  const partnerWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const persistTemplates = useCallback((next: MappingTemplate[]) => {
    setTemplates(next);
    saveTemplates(next);
  }, []);

  const parseCsvFile = useCallback(
    (file: File, setState: Dispatch<SetStateAction<CsvParseState>>, workerRef: MutableRefObject<Worker | null>) => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      const worker = buildWorker();
      workerRef.current = worker;

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
          setState({
            file,
            status: "ready",
            progressRows: data.rowCount,
            progressBytes: file.size,
            result: {
              headers: data.headers,
              sampleRows: data.sampleRows,
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
    [],
  );

  const handleVendorFile = useCallback(
    (file: File) => {
      parseCsvFile(file, setVendorState, vendorWorkerRef);
    },
    [parseCsvFile],
  );

  const handlePartnerFile = useCallback(
    (file: File) => {
      parseCsvFile(file, setPartnerState, partnerWorkerRef);
    },
    [parseCsvFile],
  );

  useEffect(() => {
    if (vendorState.result && isMappingEmpty(vendorMapping)) {
      setVendorMapping(inferMappingFromHeaders(vendorState.result.headers));
    }
  }, [vendorState.result, vendorMapping]);

  useEffect(() => {
    if (partnerState.result && isMappingEmpty(partnerMapping)) {
      setPartnerMapping(inferMappingFromHeaders(partnerState.result.headers));
    }
  }, [partnerState.result, partnerMapping]);

  useEffect(
    () => () => {
      vendorWorkerRef.current?.terminate();
      partnerWorkerRef.current?.terminate();
    },
    [],
  );

  const vendorValidation = validateMapping(vendorMapping);
  const partnerValidation = validateMapping(partnerMapping);

  const saveTemplate = () => {
    if (!templateName.trim()) {
      return;
    }

    const nextTemplate: MappingTemplate = {
      id: buildTemplateId(),
      name: templateName.trim(),
      createdAt: new Date().toISOString(),
      vendorMapping,
      partnerMapping,
    };

    const nextTemplates = [nextTemplate, ...templates].slice(0, 10);
    persistTemplates(nextTemplates);
    setTemplateName("");
    setSelectedTemplateId(nextTemplate.id);
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setVendorMapping(template.vendorMapping);
    setPartnerMapping(template.partnerMapping);
  };

  const renderMappingTable = (
    title: string,
    headers: string[],
    mapping: RawAccountMapping,
    setMapping: Dispatch<SetStateAction<RawAccountMapping>>,
    validation: ReturnType<typeof validateMapping>,
  ) => (
    <Card className="space-y-4">
      <CardHeader className="gap-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-foreground/60">
          Map uploaded columns to canonical account fields. Unmapped fields are allowed.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3">
          {canonicalFields.map((field) => (
            <label key={field.key} className="grid gap-1 text-sm">
              <span className="font-medium">
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </span>
              <select
                className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
                value={mapping[field.key]}
                onChange={(event) =>
                  setMapping((prev) => ({
                    ...prev,
                    [field.key]: event.target.value,
                  }))
                }
              >
                <option value="">Not mapped</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              <span className="text-xs text-foreground/50">{field.description}</span>
            </label>
          ))}
        </div>
        {!validation.success && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {validation.error.issues.map((issue) => issue.message).join(" ")}
          </div>
        )}
        <div className="text-xs text-foreground/60">
          Selected fields: {Object.values(normalizeMapping(mapping)).filter(Boolean).length}
        </div>
      </CardContent>
    </Card>
  );

  const vendorHeaders = vendorState.result?.headers ?? [];
  const partnerHeaders = partnerState.result?.headers ?? [];

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Account Mapping</h1>
        <p className="text-sm text-foreground/70">
          Upload vendor + partner account lists, map fields, and save templates for reuse.
        </p>
      </header>

      <Card className="space-y-6">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 1: Upload CSVs</CardTitle>
          <p className="text-sm text-foreground/60">
            Parsing happens in a web worker so large files stay responsive.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <FileDropzone
            label="Vendor list"
            description="Upload the vendor account list CSV."
            parseState={vendorState}
            onFileSelected={handleVendorFile}
          />
          <FileDropzone
            label="Partner list"
            description="Upload the partner account list CSV."
            parseState={partnerState}
            onFileSelected={handlePartnerFile}
          />
        </CardContent>
      </Card>

      <Card className="space-y-6">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 2: Preview data</CardTitle>
          <p className="text-sm text-foreground/60">
            First {MAX_PREVIEW_ROWS} rows are previewed for quick verification.
          </p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Vendor preview</h3>
            {vendorState.result ? (
              <PreviewTable
                headers={vendorState.result.headers}
                rows={vendorState.result.sampleRows.slice(0, MAX_PREVIEW_ROWS)}
              />
            ) : (
              <p className="text-sm text-foreground/60">Upload a vendor CSV to preview.</p>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Partner preview</h3>
            {partnerState.result ? (
              <PreviewTable
                headers={partnerState.result.headers}
                rows={partnerState.result.sampleRows.slice(0, MAX_PREVIEW_ROWS)}
              />
            ) : (
              <p className="text-sm text-foreground/60">Upload a partner CSV to preview.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="space-y-6">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 3: Map columns</CardTitle>
          <p className="text-sm text-foreground/60">
            Required fields must be mapped before saving templates.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {renderMappingTable(
              "Vendor mapping",
              vendorHeaders,
              vendorMapping,
              setVendorMapping,
              vendorValidation,
            )}
            {renderMappingTable(
              "Partner mapping",
              partnerHeaders,
              partnerMapping,
              setPartnerMapping,
              partnerValidation,
            )}
          </div>

          <div className="rounded-lg border border-foreground/10 bg-muted/40 px-4 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Template name</label>
                <input
                  className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="e.g. Salesforce export"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  Saved in localStorage under <code>{TEMPLATE_STORAGE_KEY}</code>.
                </p>
              </div>
              <Button
                onClick={saveTemplate}
                disabled={!templateName.trim() || !vendorValidation.success || !partnerValidation.success}
              >
                Save mapping template
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium">Load template</label>
              <select
                className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
                value={selectedTemplateId}
                onChange={(event) => {
                  setSelectedTemplateId(event.target.value);
                  applyTemplate(event.target.value);
                }}
              >
                <option value="">Select saved template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({new Date(template.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <span className="text-xs text-foreground/60">No templates saved yet.</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
