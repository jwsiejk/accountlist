"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inferMappingFromHeaders } from "@/lib/account-mapping/inference";
import { matchAccounts, type MatchResult } from "@/lib/account-mapping/match";
import { normalizeName } from "@/lib/account-mapping/normalize";
import {
  canonicalFields,
  createEmptyRawMapping,
  normalizeMapping,
  validateMapping,
  type RawAccountMapping,
} from "@/lib/account-mapping/schema";
import {
  applyDecisionsToRows,
  buildDecisionKey,
  loadDecisions,
  saveDecisions,
  type MappingDecision,
  type MappingDecisionStatus,
  type ReviewRowStatus,
} from "@/lib/account-mapping/decisionStore";
import {
  loadTemplates,
  saveTemplates,
  type MappingTemplate,
  TEMPLATE_STORAGE_KEY,
} from "@/lib/account-mapping/templateStorage";

const DEFAULT_PROGRESS_STEP = 2000;
const MAX_PREVIEW_ROWS = 20;
const REVIEW_ROW_HEIGHT = 168;
const REVIEW_LIST_HEIGHT = 560;

type CsvParseResult = {
  headers: string[];
  sampleRows: Record<string, string>[];
  rows: Record<string, string>[];
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

type AccountRecord = {
  id: string;
  accountKey: string;
  rawName: string;
  normalizedName: string;
  ownerName?: string;
  managerName?: string;
  pamName?: string;
  status?: string;
  segmentType?: string;
  crmAccountId?: string;
};

type ReviewRow = {
  id: string;
  vendor: AccountRecord;
  partner: AccountRecord | null;
  vendorAccountKey: string;
  partnerAccountKey: string | null;
  normalizedName: string;
  matchScore: number | null;
  matchType: string | null;
  status: ReviewRowStatus;
  baseStatus: MatchResult["status"];
  reasons: string[];
};

const STATUS_STYLES: Record<ReviewRowStatus, string> = {
  autoMatch: "bg-emerald-100 text-emerald-900",
  review: "bg-amber-100 text-amber-900",
  unmatched: "bg-slate-100 text-slate-700",
  confirmed: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
  manual: "bg-blue-100 text-blue-900",
};

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

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debouncedValue;
};

const VirtualizedList = <T,>({
  items,
  rowHeight,
  height,
  renderRow,
}: {
  items: T[];
  rowHeight: number;
  height: number;
  renderRow: (item: T, index: number) => ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = () => {
    if (!containerRef.current) {
      return;
    }
    setScrollTop(containerRef.current.scrollTop);
  };

  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / rowHeight) + 6,
  );
  const offsetY = startIndex * rowHeight;
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg border border-foreground/10"
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => renderRow(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
};

const ManualLinkModal = ({
  open,
  row,
  partnerOptions,
  onSelect,
  onClose,
}: {
  open: boolean;
  row: ReviewRow | null;
  partnerOptions: AccountRecord[];
  onSelect: (partner: AccountRecord) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

  const filteredPartners = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return partnerOptions.slice(0, 200);
    }
    return partnerOptions
      .filter((partner) => {
        return (
          partner.rawName.toLowerCase().includes(normalizedSearch) ||
          partner.normalizedName.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 200);
  }, [debouncedSearch, partnerOptions]);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  if (!open || !row) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10">
      <div className="w-full max-w-2xl rounded-xl border border-foreground/10 bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-foreground/50">Manual link</p>
            <p className="text-base font-semibold">{row.vendor.rawName || "Unnamed account"}</p>
            <p className="text-xs text-foreground/60">Normalized: {row.vendor.normalizedName}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="text-sm font-medium">Search partner accounts</label>
            <input
              className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
              placeholder="Search partner list..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <p className="mt-1 text-xs text-foreground/60">
              Showing up to 200 matches. Use search to refine.
            </p>
          </div>
          <div className="max-h-72 overflow-auto rounded-lg border border-foreground/10">
            {filteredPartners.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-foreground/60">
                No partner accounts match your search.
              </p>
            ) : (
              <ul className="divide-y divide-foreground/10 text-sm">
                {filteredPartners.map((partner) => (
                  <li key={partner.id} className="flex items-center justify-between px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-medium">{partner.rawName || "Unnamed account"}</p>
                      <p className="text-xs text-foreground/60">
                        Normalized: {partner.normalizedName || "—"}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => onSelect(partner)}>
                      Link
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [decisions, setDecisions] = useState<MappingDecision[]>([]);
  const [activeTab, setActiveTab] = useState<"auto" | "review" | "unmatched">("review");
  const [searchTerm, setSearchTerm] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"all" | "pending" | "decided">(
    "pending",
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [manualLinkRowId, setManualLinkRowId] = useState<string | null>(null);

  const vendorWorkerRef = useRef<Worker | null>(null);
  const partnerWorkerRef = useRef<Worker | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const decisionsLoadedRef = useRef(false);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadDecisions().then((stored) => {
      if (!isMounted) {
        return;
      }
      setDecisions(stored);
      decisionsLoadedRef.current = true;
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!decisionsLoadedRef.current) {
      return;
    }
    void saveDecisions(decisions);
  }, [decisions]);

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

  const buildAccountRecords = useCallback(
    (
      rows: Record<string, string>[],
      mapping: ReturnType<typeof normalizeMapping>,
      prefix: string,
    ): AccountRecord[] => {
      const nameKey = mapping.account_name;
      if (!nameKey) {
        return [];
      }

      return rows.map((row, index) => {
        const rawName = row[nameKey] ?? "";
        const normalized = normalizeName(rawName);
        const crmAccountId = mapping.crm_account_id ? row[mapping.crm_account_id] ?? "" : "";
        const accountKey = crmAccountId || rawName || `${prefix}-${index}`;

        return {
          id: `${prefix}-${index}`,
          accountKey,
          rawName,
          normalizedName: normalized,
          ownerName: mapping.owner_name ? row[mapping.owner_name] ?? "" : "",
          managerName: mapping.manager_name ? row[mapping.manager_name] ?? "" : "",
          pamName: mapping.pam_name ? row[mapping.pam_name] ?? "" : "",
          status: mapping.status ? row[mapping.status] ?? "" : "",
          segmentType: mapping.segment_type ? row[mapping.segment_type] ?? "" : "",
          crmAccountId: crmAccountId || undefined,
        };
      });
    },
    [],
  );

  const handleDecision = useCallback(
    (row: ReviewRow, decision: MappingDecisionStatus, partnerOverride?: AccountRecord | null) => {
      const partnerKey =
        partnerOverride?.accountKey ?? row.partner?.accountKey ?? row.partnerAccountKey ?? "";
      const decisionEntry: MappingDecision = {
        key: buildDecisionKey(row.vendorAccountKey, partnerKey, row.normalizedName),
        vendorAccountKey: row.vendorAccountKey,
        partnerAccountKey: partnerKey,
        normalizedName: row.normalizedName,
        decision,
        updatedAt: new Date().toISOString(),
      };

      setDecisions((prev) => {
        const existingIndex = prev.findIndex((item) => item.key === decisionEntry.key);
        if (existingIndex === -1) {
          return [decisionEntry, ...prev];
        }
        const next = [...prev];
        next[existingIndex] = decisionEntry;
        return next;
      });
    },
    [],
  );

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

  const normalizedVendorMapping = useMemo(
    () => normalizeMapping(vendorMapping),
    [vendorMapping],
  );
  const normalizedPartnerMapping = useMemo(
    () => normalizeMapping(partnerMapping),
    [partnerMapping],
  );

  const vendorRows = vendorState.result?.rows ?? [];
  const partnerRows = partnerState.result?.rows ?? [];

  const vendorRecords = useMemo(
    () => buildAccountRecords(vendorRows, normalizedVendorMapping, "vendor"),
    [buildAccountRecords, vendorRows, normalizedVendorMapping],
  );
  const partnerRecords = useMemo(
    () => buildAccountRecords(partnerRows, normalizedPartnerMapping, "partner"),
    [buildAccountRecords, partnerRows, normalizedPartnerMapping],
  );

  const vendorById = useMemo(
    () => new Map(vendorRecords.map((record) => [record.id, record])),
    [vendorRecords],
  );
  const partnerById = useMemo(
    () => new Map(partnerRecords.map((record) => [record.id, record])),
    [partnerRecords],
  );
  const partnerByAccountKey = useMemo(
    () => new Map(partnerRecords.map((record) => [record.accountKey, record])),
    [partnerRecords],
  );

  const matchResults = useMemo(() => {
    if (vendorRecords.length === 0 || partnerRecords.length === 0) {
      return [];
    }
    return matchAccounts(
      vendorRecords.map((record) => ({ id: record.id, name: record.rawName })),
      partnerRecords.map((record) => ({ id: record.id, name: record.rawName })),
    );
  }, [vendorRecords, partnerRecords]);

  const baseReviewRows = useMemo(() => {
    return matchResults
      .map((result) => {
        const vendor = vendorById.get(result.source.id);
        if (!vendor) {
          return null;
        }
        const partner = result.best ? partnerById.get(result.best.id) ?? null : null;
        return {
          id: vendor.id,
          vendor,
          partner,
          vendorAccountKey: vendor.accountKey,
          partnerAccountKey: partner?.accountKey ?? null,
          normalizedName: result.normalizedName,
          matchScore: result.best?.score ?? null,
          matchType: result.best?.matchType ?? null,
          status: result.status,
          baseStatus: result.status,
          reasons: result.best?.reasons ?? [],
        } satisfies ReviewRow;
      })
      .filter((row): row is ReviewRow => Boolean(row));
  }, [matchResults, partnerById, vendorById]);

  const reviewRows = useMemo(() => {
    const withDecisions = applyDecisionsToRows(baseReviewRows, decisions);
    return withDecisions.map((row) => {
      if (!row.partnerAccountKey) {
        return row;
      }
      const partner = partnerByAccountKey.get(row.partnerAccountKey) ?? row.partner;
      return {
        ...row,
        partner,
      };
    });
  }, [baseReviewRows, decisions, partnerByAccountKey]);

  const debouncedSearch = useDebouncedValue(searchTerm, 200);

  const filteredRows = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    return reviewRows.filter((row) => {
      if (activeTab === "auto" && row.baseStatus !== "autoMatch") {
        return false;
      }
      if (activeTab === "review" && row.baseStatus !== "review") {
        return false;
      }
      if (activeTab === "unmatched" && row.baseStatus !== "unmatched") {
        return false;
      }
      if (decisionFilter === "pending" && ["confirmed", "rejected", "manual"].includes(row.status)) {
        return false;
      }
      if (
        decisionFilter === "decided" &&
        !["confirmed", "rejected", "manual"].includes(row.status)
      ) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      const partnerName = row.partner?.rawName ?? "";
      return (
        row.vendor.rawName.toLowerCase().includes(normalizedSearch) ||
        row.vendor.normalizedName.toLowerCase().includes(normalizedSearch) ||
        partnerName.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [activeTab, debouncedSearch, decisionFilter, reviewRows]);

  const summary = useMemo(() => {
    const total = reviewRows.length;
    const matched = reviewRows.filter((row) => row.baseStatus === "autoMatch").length;
    const needsReview = reviewRows.filter((row) => row.baseStatus === "review").length;
    const unmatched = reviewRows.filter((row) => row.baseStatus === "unmatched").length;
    return { total, matched, needsReview, unmatched };
  }, [reviewRows]);

  const selectedRow = useMemo(
    () => reviewRows.find((row) => row.id === selectedRowId) ?? null,
    [reviewRows, selectedRowId],
  );

  const manualLinkRow = useMemo(
    () => reviewRows.find((row) => row.id === manualLinkRowId) ?? null,
    [manualLinkRowId, reviewRows],
  );

  const hasUploads = Boolean(vendorState.result && partnerState.result);
  const hasMappings = vendorValidation.success && partnerValidation.success;
  const hasMatches = matchResults.length > 0;

  const currentStep = hasMatches ? 3 : hasMappings ? 2 : hasUploads ? 1 : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if (event.key === "/" && !isEditable) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!selectedRow || isEditable) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        handleDecision(selectedRow, "confirmed");
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        handleDecision(selectedRow, "rejected");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDecision, selectedRow]);

  const vendorHeaders = vendorState.result?.headers ?? [];
  const partnerHeaders = partnerState.result?.headers ?? [];

  return (
    <section className="space-y-8">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Account Mapping</h1>
          <p className="text-sm text-foreground/70">
            Upload vendor + partner account lists, map fields, and save templates for reuse.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {["Upload", "Map", "Match", "Review", "Export"].map((step, index) => (
            <div
              key={step}
              className={`rounded-full px-3 py-1 ${
                index <= currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/60"
              }`}
            >
              {step}
            </div>
          ))}
        </div>
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

      <Card className="space-y-6">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 4: Review matches</CardTitle>
          <p className="text-sm text-foreground/60">
            Auto-matches, review queue, and unmatched accounts with manual linking.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasMatches ? (
            <div className="rounded-lg border border-foreground/10 bg-muted/40 px-4 py-6 text-sm text-foreground/60">
              Upload both CSVs and map the account name field to generate matching results.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border border-foreground/10">
                  <CardContent className="space-y-1 py-4">
                    <p className="text-xs uppercase text-foreground/50">Total rows</p>
                    <p className="text-2xl font-semibold">{summary.total.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border border-foreground/10">
                  <CardContent className="space-y-1 py-4">
                    <p className="text-xs uppercase text-foreground/50">Matched</p>
                    <p className="text-2xl font-semibold">{summary.matched.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border border-foreground/10">
                  <CardContent className="space-y-1 py-4">
                    <p className="text-xs uppercase text-foreground/50">Needs review</p>
                    <p className="text-2xl font-semibold">
                      {summary.needsReview.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-foreground/10">
                  <CardContent className="space-y-1 py-4">
                    <p className="text-xs uppercase text-foreground/50">Unmatched</p>
                    <p className="text-2xl font-semibold">{summary.unmatched.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[240px] flex-1">
                  <label className="text-sm font-medium">Search accounts</label>
                  <input
                    ref={searchInputRef}
                    className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
                    placeholder="Search by account name or normalized name…"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  <p className="mt-1 text-xs text-foreground/60">
                    Shortcut: <span className="font-semibold">/</span> focuses search.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Decision filter</label>
                  <select
                    className="mt-2 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
                    value={decisionFilter}
                    onChange={(event) =>
                      setDecisionFilter(event.target.value as "all" | "pending" | "decided")
                    }
                  >
                    <option value="pending">Pending decisions</option>
                    <option value="decided">Decided</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={activeTab === "auto" ? "default" : "secondary"}
                  onClick={() => setActiveTab("auto")}
                >
                  Auto ({summary.matched.toLocaleString()})
                </Button>
                <Button
                  variant={activeTab === "review" ? "default" : "secondary"}
                  onClick={() => setActiveTab("review")}
                >
                  Review ({summary.needsReview.toLocaleString()})
                </Button>
                <Button
                  variant={activeTab === "unmatched" ? "default" : "secondary"}
                  onClick={() => setActiveTab("unmatched")}
                >
                  Unmatched ({summary.unmatched.toLocaleString()})
                </Button>
                <span className="text-xs text-foreground/60">
                  Showing {filteredRows.length.toLocaleString()} of{" "}
                  {reviewRows.length.toLocaleString()}
                </span>
              </div>

              <VirtualizedList
                items={filteredRows}
                rowHeight={REVIEW_ROW_HEIGHT}
                height={REVIEW_LIST_HEIGHT}
                renderRow={(row) => {
                  const isSelected = row.id === selectedRowId;
                  const statusStyle = STATUS_STYLES[row.status];
                  return (
                    <div
                      key={row.id}
                      className={`border-b border-foreground/10 px-4 py-4 ${
                        isSelected ? "bg-muted/40" : "bg-background"
                      }`}
                      style={{ height: REVIEW_ROW_HEIGHT }}
                      onClick={() => setSelectedRowId(row.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-1 gap-6">
                          <div className="w-1/2 space-y-2">
                            <p className="text-xs uppercase text-foreground/50">Vendor</p>
                            <div>
                              <p className="text-sm font-semibold">
                                {row.vendor.rawName || "Unnamed account"}
                              </p>
                              <p className="text-xs text-foreground/60">
                                Normalized: {row.vendor.normalizedName || "—"}
                              </p>
                            </div>
                            <div className="text-xs text-foreground/60">
                              {row.vendor.ownerName ? (
                                <p>Owner: {row.vendor.ownerName}</p>
                              ) : null}
                              {row.vendor.managerName ? (
                                <p>Manager: {row.vendor.managerName}</p>
                              ) : null}
                              {row.vendor.pamName ? <p>PAM: {row.vendor.pamName}</p> : null}
                              {row.vendor.status ? <p>Status: {row.vendor.status}</p> : null}
                              {row.vendor.segmentType ? (
                                <p>Segment: {row.vendor.segmentType}</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="w-1/2 space-y-2">
                            <p className="text-xs uppercase text-foreground/50">Partner</p>
                            <div>
                              <p className="text-sm font-semibold">
                                {row.partner?.rawName || "No match"}
                              </p>
                              <p className="text-xs text-foreground/60">
                                Normalized: {row.partner?.normalizedName || "—"}
                              </p>
                            </div>
                            <div className="text-xs text-foreground/60">
                              {row.partner?.ownerName ? (
                                <p>Owner: {row.partner.ownerName}</p>
                              ) : null}
                              {row.partner?.managerName ? (
                                <p>Manager: {row.partner.managerName}</p>
                              ) : null}
                              {row.partner?.pamName ? <p>PAM: {row.partner.pamName}</p> : null}
                              {row.partner?.status ? <p>Status: {row.partner.status}</p> : null}
                              {row.partner?.segmentType ? (
                                <p>Segment: {row.partner.segmentType}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 text-right">
                          <div className="flex flex-col items-end gap-2 text-xs">
                            <span className={`rounded-full px-2 py-1 ${statusStyle}`}>
                              {row.status}
                            </span>
                            {row.matchScore !== null ? (
                              <span className="text-foreground/60">
                                Score {row.matchScore} ({row.matchType})
                              </span>
                            ) : (
                              <span className="text-foreground/40">No score</span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedRowId(row.id);
                                handleDecision(row, "confirmed");
                              }}
                            >
                              Confirm match
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedRowId(row.id);
                                handleDecision(row, "rejected");
                              }}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedRowId(row.id);
                                setManualLinkRowId(row.id);
                              }}
                            >
                              Manual link
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <p className="text-xs text-foreground/60">
                Shortcuts: <span className="font-semibold">Enter</span> confirms,{" "}
                <span className="font-semibold">R</span> rejects.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ManualLinkModal
        open={Boolean(manualLinkRow)}
        row={manualLinkRow}
        partnerOptions={partnerRecords}
        onSelect={(partner) => {
          if (!manualLinkRow) {
            return;
          }
          handleDecision(manualLinkRow, "manual", partner);
          setManualLinkRowId(null);
        }}
        onClose={() => setManualLinkRowId(null)}
      />
    </section>
  );
}
