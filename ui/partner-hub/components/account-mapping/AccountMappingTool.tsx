"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inferMappingFromHeaders } from "@/lib/account-mapping/inference";
import {
  canonicalFields,
  createEmptyRawMapping,
  DEFAULT_VISIBLE_FIELD_KEYS,
  validateMapping,
  type CanonicalFieldKey,
  type RawAccountMapping,
} from "@/lib/account-mapping/schema";
import { buildCsv, downloadCsv } from "@/lib/account-mapping/csv";
import { TEMPLATE_STORAGE_KEY } from "@/lib/account-mapping/templateStorage";
import { mergedAccountExportHeaders, targetExportHeaders } from "@/lib/account-mapping/exportSchema";
import { type MergedSearchRow } from "@/lib/account-mapping/mergedSearch";
import { type MergedSearchDatasetSelection } from "@/lib/account-mapping/mergedSearchDataset";
import { saveRun, type AccountMappingRun, type StoredCsvSnapshot } from "@/lib/account-mapping/runHistory";
import { withBasePath } from "@/lib/basePath";

import { AiReviewModal } from "./AiReviewModal";
import {
  INPUT_BASE_CLASSES,
  MAX_PREVIEW_ROWS,
  REVIEW_LIST_HEIGHT,
  REVIEW_ROW_HEIGHT,
  STATUS_STYLES,
} from "./constants";
import { FileDropzone } from "./FileDropzone";
import { ManualLinkModal } from "./ManualLinkModal";
import { MappingTableCard } from "./MappingTableCard";
import { MergedDatasetSearchPanelSimple } from "./MergedDatasetSearchPanelSimple";
import { PreviewTable } from "./PreviewTable";
import { VirtualizedList } from "./VirtualizedList";
import { useCsvParseWorkers, type RunStats } from "./hooks/useCsvParseWorkers";
import { useAccountMappingModel } from "./hooks/useAccountMappingModel";
import { useAiReview } from "./hooks/useAiReview";
import { useAccountMappingViewModel } from "./hooks/useAccountMappingViewModel";
import { useMappingDecisions } from "./hooks/useMappingDecisions";
import { useMappingTemplates } from "./hooks/useMappingTemplates";
import { useRunHistory } from "./hooks/useRunHistory";
import type { CsvParseState, TargetRuleState, TourStep } from "./types";
import { buildCsvSnapshot, buildRunId, isMappingEmpty } from "./utils";
import { AccountMappingExportsPanel } from "./ui/AccountMappingExportsPanel";
import { AccountMappingFiltersBar } from "./ui/AccountMappingFiltersBar";
import { AccountMappingHeader } from "./ui/AccountMappingHeader";
import { AccountMappingStatsBar } from "./ui/AccountMappingStatsBar";
const DEMO_VENDOR_URL = withBasePath("/samples/account-mapping/vendor.csv");
const DEMO_PARTNER_URL = withBasePath("/samples/account-mapping/partner.csv");

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
  const [mergedSearchState, setMergedSearchState] = useState<CsvParseState>({
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
  const [visibleColumns, setVisibleColumns] = useState<CanonicalFieldKey[]>(
    DEFAULT_VISIBLE_FIELD_KEYS,
  );
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const addColumnRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<"auto" | "review" | "unmatched">("review");
  const [searchTerm, setSearchTerm] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"all" | "pending" | "decided">(
    "pending",
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [manualLinkRowId, setManualLinkRowId] = useState<string | null>(null);
  const [mergedSearchDatasetSelection, setMergedSearchDatasetSelection] =
    useState<MergedSearchDatasetSelection>("run");
  const [targetRule, setTargetRule] = useState<TargetRuleState>({
    mode: "both",
    vendorStatus: "",
    partnerStatus: "",
    eitherStatus: "",
  });
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [runStats, setRunStats] = useState<RunStats>({
    vendorParseMs: 0,
    partnerParseMs: 0,
    matchMs: 0,
    totalMs: 0,
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { parseVendorCsv, parsePartnerCsv, parseMergedSearchCsv, resetRunTracking, runStartRef } =
    useCsvParseWorkers({ setRunStats });
  const templatesApi = useMappingTemplates();
  const decisionsApi = useMappingDecisions();
  const runHistoryApi = useRunHistory();

  const {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    templateName,
    setTemplateName,
    saveCurrentTemplate,
    applyTemplate,
  } = templatesApi;
  const { decisions, setDecisions, handleDecision, buildDecisionKey } = decisionsApi;
  const {
    runHistory,
    runHistoryStatus,
    runHistoryError,
    refreshRunHistory,
    setRunHistoryStatus,
    setRunHistoryError,
  } = runHistoryApi;

  const handleVendorFile = useCallback(
    (file: File) => {
      if (
        (vendorState.file && partnerState.file) ||
        (vendorState.file && vendorState.file.name !== file.name)
      ) {
        resetRunTracking();
      }
      parseVendorCsv(file, setVendorState);
    },
    [parseVendorCsv, partnerState.file, resetRunTracking, vendorState.file],
  );

  const handlePartnerFile = useCallback(
    (file: File) => {
      if (
        (vendorState.file && partnerState.file) ||
        (partnerState.file && partnerState.file.name !== file.name)
      ) {
        resetRunTracking();
      }
      parsePartnerCsv(file, setPartnerState);
    },
    [parsePartnerCsv, partnerState.file, resetRunTracking, vendorState.file],
  );

  const handleMergedSearchFile = useCallback(
    (file: File) => {
      parseMergedSearchCsv(file, setMergedSearchState);
    },
    [parseMergedSearchCsv],
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

  const vendorValidation = validateMapping(vendorMapping);
  const partnerValidation = validateMapping(partnerMapping);

  const saveTemplate = useCallback(() => {
    saveCurrentTemplate({ vendorMapping, partnerMapping });
  }, [partnerMapping, saveCurrentTemplate, vendorMapping]);

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const template = applyTemplate(templateId);
      if (!template) {
        return;
      }
      setVendorMapping(template.vendorMapping);
      setPartnerMapping(template.partnerMapping);
    },
    [applyTemplate, setPartnerMapping, setVendorMapping],
  );

  const {
    vendorRecords,
    partnerRecords,
    matchResults,
    reviewRows,
    reviewRowById,
    modelStats,
    timings,
  } = useAccountMappingModel({
    vendorParseResult: vendorState.result,
    partnerParseResult: partnerState.result,
    vendorMapping,
    partnerMapping,
    decisions,
  });

  const aiReview = useAiReview({
    reviewRows,
    buildDecisionKey,
  });

  useEffect(() => {
    const runStart = runStartRef;
    if (!timings.matchMs && matchResults.length === 0) {
      return;
    }
    const endTime = performance.now();
    setRunStats((prev) => ({
      ...prev,
      matchMs: timings.matchMs,
      totalMs: runStart.current ? endTime - runStart.current : prev.totalMs,
    }));
  }, [matchResults.length, runStartRef, setRunStats, timings.matchMs]);

  const vendorFileName = vendorState.file?.name ?? "";
  const partnerFileName = partnerState.file?.name ?? "";

  const {
    filteredRows,
    statusOptions,
    matchPairs,
    mergedExportRows,
    mergedExportCsvRows,
    targetRows,
    targetPreview,
    targetExportCsvRows,
    activeMergedSearchDataset,
    mergedSearchRows,
    mergedSearchHeaders,
    mergedSearchLabel,
    latestComparableRun,
    diffSummary,
    buildMergedSearchCsvRows,
  } = useAccountMappingViewModel({
    reviewRows,
    reviewRowById,
    runHistory,
    vendorFileName,
    partnerFileName,
    activeTab,
    decisionFilter,
    searchTerm,
    targetRule,
    mergedSearchDatasetSelection,
    setMergedSearchDatasetSelection,
    mergedSearchState,
    vendorRecords,
    partnerRecords,
  });

  const summary = modelStats;

  const selectedRow = useMemo(
    () => reviewRows.find((row) => row.id === selectedRowId) ?? null,
    [reviewRows, selectedRowId],
  );

  const manualLinkRow = useMemo(
    () => reviewRows.find((row) => row.id === manualLinkRowId) ?? null,
    [manualLinkRowId, reviewRows],
  );

  const hasUploads = vendorRecords.length > 0 || partnerRecords.length > 0;
  const hasMappings = vendorValidation.success && partnerValidation.success;
  const hasMatches =
    matchResults.length > 0 ||
    reviewRows.length > 0 ||
    unmatchedRows.length > 0;

  let currentStep = -1;
  if (hasUploads) {
    currentStep = 0;
  }
  if (hasMappings) {
    currentStep = 1;
  }
  if (hasMatches) {
    currentStep = 2;
  }

  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        id: "upload",
        title: "Upload vendor + partner CSVs",
        body: "Upload both CSVs here, or click Load demo dataset to explore the flow instantly.",
        highlight: hasUploads ? "Both files are ready for mapping." : "Demo data is available if you don’t have CSVs handy.",
        targetId: "upload-section",
        fallbackTargetId: "upload",
      },
      {
        id: "map",
        title: "Map columns (Step 3)",
        body: "Map vendor + partner columns to canonical fields. Mapped fields become searchable columns in Review and Search.",
        highlight: hasMappings ? "Required fields are mapped." : "Map the required fields to unlock matching.",
        targetId: "map-section",
        fallbackTargetId: "map",
      },
      {
        id: "match",
        title: "Run matching",
        body: "Once both lists are mapped, run matching to generate auto-matches, a review queue, and unmatched rows.",
        highlight: hasMatches
          ? `${summary.matched.toLocaleString()} auto-matches and ${summary.needsReview.toLocaleString()} to review.`
          : "Matching runs after required fields are mapped.",
        targetId: "match-section",
        fallbackTargetId: "review-section",
        onEnter: () => setActiveTab("auto"),
      },
      {
        id: "review",
        title: "Review ambiguous matches",
        body: "Review shared or ambiguous pairs, confirm or reject matches, and manage unmatched accounts.",
        highlight: hasMatches
          ? `${summary.needsReview.toLocaleString()} accounts need review.`
          : "Review tools appear once matches are available.",
        targetId: "review-section",
        fallbackTargetId: "review",
        onEnter: () => setActiveTab("review"),
      },
      {
        id: "search",
        title: "Search the merged dataset",
        body: "Search and filter the merged dataset to see every mapped column. Use the current run or upload a merged CSV.",
        highlight:
          mergedSearchHeaders.length > 0
            ? `Showing ${mergedSearchHeaders.length.toLocaleString()} mapped columns.`
            : "Search is ready as soon as matches are available.",
        targetId: "search-section",
        fallbackTargetId: "search",
        onEnter: () => setMergedSearchDatasetSelection("run"),
      },
      {
        id: "export",
        title: "Export results",
        body: "Export merged results or target lists for downstream activation and sharing.",
        highlight: hasMatches
          ? `${mergedExportRows.length.toLocaleString()} merged rows ready to export.`
          : "Exports are available after matching runs.",
        targetId: "export-section",
        fallbackTargetId: "export",
      },
    ],
    [
      hasMatches,
      hasUploads,
      hasMappings,
      mergedExportRows.length,
      mergedSearchHeaders.length,
      summary.matched,
      summary.needsReview,
      setActiveTab,
      setMergedSearchDatasetSelection,
    ],
  );

  const activeTourStep = tourStepIndex !== null ? tourSteps[tourStepIndex] : null;

  const resolveTourTarget = useCallback((step: TourStep) => {
    const targetIds = [step.targetId, step.fallbackTargetId].filter(Boolean) as string[];
    for (const targetId of targetIds) {
      const element = document.querySelector(`[data-tour="${targetId}"]`);
      if (element) {
        return element;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!activeTourStep || tourStepIndex === null) {
      return;
    }
    activeTourStep.onEnter?.();
    const timer = window.setTimeout(() => {
      const target = resolveTourTarget(activeTourStep);
      if (!target) {
        setTourStepIndex((prev) => {
          if (prev === null) {
            return prev;
          }
          if (prev >= tourSteps.length - 1) {
            return null;
          }
          return prev + 1;
        });
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeTourStep, resolveTourTarget, tourStepIndex, tourSteps.length]);

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

  useEffect(() => {
    if (!isAddColumnOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!addColumnRef.current?.contains(event.target as Node)) {
        setIsAddColumnOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isAddColumnOpen]);

  const vendorHeaders = vendorState.result?.headers ?? [];
  const partnerHeaders = partnerState.result?.headers ?? [];

  const hiddenColumns = useMemo(
    () => canonicalFields.filter((field) => !visibleColumns.includes(field.key)),
    [visibleColumns],
  );
  const removableColumns = useMemo(
    () => visibleColumns.filter((fieldKey) => !DEFAULT_VISIBLE_FIELD_KEYS.includes(fieldKey)),
    [visibleColumns],
  );

  const handleAddColumn = useCallback((fieldKey: CanonicalFieldKey) => {
    setVisibleColumns((prev) => (prev.includes(fieldKey) ? prev : [...prev, fieldKey]));
    setIsAddColumnOpen(false);
  }, []);

  const handleRemoveColumn = useCallback((fieldKey: CanonicalFieldKey) => {
    if (DEFAULT_VISIBLE_FIELD_KEYS.includes(fieldKey)) {
      return;
    }
    setVisibleColumns((prev) => prev.filter((key) => key !== fieldKey));
    setVendorMapping((prev) => ({ ...prev, [fieldKey]: "" }));
    setPartnerMapping((prev) => ({ ...prev, [fieldKey]: "" }));
  }, []);

  const saveRunSnapshot = useCallback(async () => {
    if (!vendorState.result || !partnerState.result) {
      return;
    }

    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
    const templateNameValue = selectedTemplate?.name ?? "Custom mapping";

    const nextRun: AccountMappingRun = {
      runId: buildRunId(),
      timestamp: new Date().toISOString(),
      vendorFileName: vendorFileName || "Vendor CSV",
      partnerFileName: partnerFileName || "Partner CSV",
      rowCounts: {
        vendor: vendorRecords.length,
        partner: partnerRecords.length,
        matches: matchPairs.length,
        targets: targetRows.length,
      },
      templateName: templateNameValue,
      templateId: selectedTemplate?.id,
      vendorMapping,
      partnerMapping,
      vendorSnapshot: buildCsvSnapshot(vendorState),
      partnerSnapshot: buildCsvSnapshot(partnerState),
      decisions,
      matchPairs,
    };

    try {
      await saveRun(nextRun);
      refreshRunHistory();
    } catch (error) {
      setRunHistoryStatus("error");
      setRunHistoryError(
        error instanceof Error ? error.message : "Failed to save run history",
      );
    }
  }, [
    decisions,
    matchPairs,
    partnerFileName,
    partnerMapping,
    partnerRecords.length,
    partnerState,
    refreshRunHistory,
    selectedTemplateId,
    targetRows.length,
    templates,
    setRunHistoryError,
    setRunHistoryStatus,
    vendorFileName,
    vendorMapping,
    vendorRecords.length,
    vendorState,
  ]);

  const handleDownloadMerged = useCallback(async () => {
    const csv = buildCsv(
      [...mergedAccountExportHeaders],
      mergedExportCsvRows,
    );
    downloadCsv("merged_accounts.csv", csv);
    await saveRunSnapshot();
  }, [mergedExportCsvRows, saveRunSnapshot]);

  const handleDownloadTargets = useCallback(async () => {
    const csv = buildCsv(
      [...targetExportHeaders],
      targetExportCsvRows,
    );
    downloadCsv("targets.csv", csv);
    await saveRunSnapshot();
  }, [saveRunSnapshot, targetExportCsvRows]);

  const handleDownloadMergedSearch = useCallback(
    (rows: MergedSearchRow[], headers: string[]) => {
      const csv = buildCsv(
        [...headers],
        buildMergedSearchCsvRows(rows, headers),
      );
      downloadCsv("merged_search.csv", csv);
    },
    [buildMergedSearchCsvRows],
  );

  const handleOpenRun = useCallback(
    (run: AccountMappingRun) => {
      setVendorState({
        file: new File([""], run.vendorFileName),
        status: "ready",
        progressRows: run.vendorSnapshot.rowCount,
        progressBytes: 0,
        result: {
          headers: run.vendorSnapshot.headers,
          rows: run.vendorSnapshot.rows,
          sampleRows: run.vendorSnapshot.rows.slice(0, MAX_PREVIEW_ROWS),
          rowCount: run.vendorSnapshot.rowCount,
          inferredDelimiter: run.vendorSnapshot.inferredDelimiter,
        },
      });
      setPartnerState({
        file: new File([""], run.partnerFileName),
        status: "ready",
        progressRows: run.partnerSnapshot.rowCount,
        progressBytes: 0,
        result: {
          headers: run.partnerSnapshot.headers,
          rows: run.partnerSnapshot.rows,
          sampleRows: run.partnerSnapshot.rows.slice(0, MAX_PREVIEW_ROWS),
          rowCount: run.partnerSnapshot.rowCount,
          inferredDelimiter: run.partnerSnapshot.inferredDelimiter,
        },
      });
      setVendorMapping(run.vendorMapping);
      setPartnerMapping(run.partnerMapping);
      setDecisions(run.decisions);
      setSelectedTemplateId(run.templateId ?? "");
    },
    [
      setDecisions,
      setPartnerMapping,
      setPartnerState,
      setSelectedTemplateId,
      setVendorMapping,
      setVendorState,
    ],
  );

  const loadDemoDataset = useCallback(async () => {
    setIsDemoLoading(true);
    setDemoError(null);
    setStatsOpen(true);
    resetRunTracking();
    setVendorMapping(createEmptyRawMapping());
    setPartnerMapping(createEmptyRawMapping());
    setSelectedTemplateId("");
    setTemplateName("");
    setDecisions([]);
    setSelectedRowId(null);
    setManualLinkRowId(null);
    setDecisionFilter("pending");
    setSearchTerm("");
    setActiveTab("review");
    setTargetRule({
      mode: "both",
      vendorStatus: "Customer",
      partnerStatus: "Prospect",
      eitherStatus: "",
    });

    try {
      const [vendorResponse, partnerResponse] = await Promise.all([
        fetch(DEMO_VENDOR_URL),
        fetch(DEMO_PARTNER_URL),
      ]);
      if (!vendorResponse.ok || !partnerResponse.ok) {
        throw new Error("Unable to load demo datasets. Please try again.");
      }
      const [vendorText, partnerText] = await Promise.all([
        vendorResponse.text(),
        partnerResponse.text(),
      ]);

      const vendorFile = new File([vendorText], "vendor-demo.csv", {
        type: "text/csv",
      });
      const partnerFile = new File([partnerText], "partner-demo.csv", {
        type: "text/csv",
      });

      handleVendorFile(vendorFile);
      handlePartnerFile(partnerFile);
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : "Unable to load demo dataset.");
      setTourStepIndex(null);
    } finally {
      setIsDemoLoading(false);
    }
  }, [
    handlePartnerFile,
    handleVendorFile,
    resetRunTracking,
    setDecisions,
    setSelectedTemplateId,
    setTemplateName,
  ]);

  return (
    <section className="space-y-8 md:space-y-10">
      <AccountMappingHeader
        isDemoLoading={isDemoLoading}
        demoError={demoError}
        currentStep={currentStep}
        isTourActive={tourStepIndex !== null}
        onLoadDemo={loadDemoDataset}
        onStartTour={() => setTourStepIndex(0)}
      />

      <AccountMappingStatsBar
        runStats={runStats}
        statsOpen={statsOpen}
        onToggleStats={() => setStatsOpen((prev) => !prev)}
      />

      <Card className="space-y-6" data-tour="upload-section">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 1: Upload CSVs</CardTitle>
          <p className="text-sm text-foreground/60">
            Parsing happens in a web worker so large files stay responsive. Or use the demo data above.
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
            First {MAX_PREVIEW_ROWS} rows are previewed for quick verification before matching.
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
              <p className="text-sm text-foreground/60">
                Upload a vendor CSV or use the demo dataset to preview instantly.
              </p>
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
              <p className="text-sm text-foreground/60">
                Upload a partner CSV or use the demo dataset to preview instantly.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="space-y-6" data-tour="map-section">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-lg">Step 3: Map columns</CardTitle>
              <p className="text-sm text-foreground/60">
                Required fields must be mapped before saving templates. Auto-mapping uses header inference.
              </p>
            </div>
            <div className="relative" ref={addColumnRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddColumnOpen((prev) => !prev)}
                disabled={hiddenColumns.length === 0}
              >
                Add Column
              </Button>
              {isAddColumnOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-foreground/10 bg-background shadow-lg">
                  <div className="max-h-64 overflow-auto py-2 text-sm">
                    {hiddenColumns.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-foreground/50">
                        All columns are already visible.
                      </div>
                    ) : (
                      hiddenColumns.map((field) => (
                        <button
                          key={field.key}
                          type="button"
                          className="group flex w-full items-center justify-between px-4 py-2 text-left transition hover:bg-muted/60 focus-visible:bg-muted/60"
                          onClick={() => handleAddColumn(field.key)}
                        >
                          <span>{field.label}</span>
                          <span className="text-base text-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                            +
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <MappingTableCard
              title="Vendor mapping"
              headers={vendorHeaders}
              mapping={vendorMapping}
              setMapping={setVendorMapping}
              validation={vendorValidation}
              visibleFields={visibleColumns}
              removableFields={removableColumns}
              onRemoveField={handleRemoveColumn}
            />
            <MappingTableCard
              title="Partner mapping"
              headers={partnerHeaders}
              mapping={partnerMapping}
              setMapping={setPartnerMapping}
              validation={partnerValidation}
              visibleFields={visibleColumns}
              removableFields={removableColumns}
              onRemoveField={handleRemoveColumn}
            />
          </div>

          <div className="rounded-lg border border-foreground/10 bg-muted/40 px-4 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium" htmlFor="template-name">
                  Template name
                </label>
                <input
                  id="template-name"
                  className={`mt-2 w-full ${INPUT_BASE_CLASSES}`}
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
              <label className="text-sm font-medium" htmlFor="template-select">
                Load template
              </label>
              <select
                id="template-select"
                className={INPUT_BASE_CLASSES}
                value={selectedTemplateId}
                onChange={(event) => {
                  setSelectedTemplateId(event.target.value);
                  handleApplyTemplate(event.target.value);
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

      <Card className="space-y-6" data-tour="review-section">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 4: Review matches</CardTitle>
          <p className="text-sm text-foreground/60">
            Auto-matches, review queue, and unmatched accounts with manual linking.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasMatches ? (
            <div
              className="rounded-lg border border-foreground/10 bg-muted/40 px-4 py-6 text-sm text-foreground/60"
              data-tour="match-section"
            >
              Upload both CSVs (or load the demo dataset) and map the account name field to generate
              matching results. Matches appear instantly once both lists are ready.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4" data-tour="match-section">
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

              <div data-tour="review-queue">
                <AccountMappingFiltersBar
                  searchInputRef={searchInputRef}
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                  decisionFilter={decisionFilter}
                  onDecisionFilterChange={setDecisionFilter}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  summary={summary}
                  filteredRowsCount={filteredRows.length}
                  totalRowsCount={reviewRows.length}
                  onOpenAiReview={() => aiReview.setAiReviewOpen(true)}
                  aiReviewDisabled={reviewRows.length === 0}
                />
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
                      className={`relative mx-2 cursor-pointer rounded-lg border border-foreground/10 bg-background px-4 py-4 shadow-sm transition-colors transition-shadow before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-lg before:bg-transparent hover:bg-primary/5 hover:shadow-md hover:before:bg-primary/40 ${
                        isSelected ? "bg-primary/10 ring-1 ring-primary/25 before:bg-primary/60" : ""
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
                        <div className="w-32 shrink-0 space-y-3 text-right">
                          <div className="flex flex-col items-end gap-2 text-xs">
                            <span
                              className={`inline-flex items-center rounded-full border border-foreground/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyle}`}
                            >
                              {row.status === "autoMatch" ? "auto" : row.status}
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
                              className="w-fit min-w-[112px] whitespace-nowrap"
                              variant="confirm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedRowId(row.id);
                                handleDecision(row, "confirmed");
                              }}
                            >
                              Confirm Match
                            </Button>
                            <Button
                              size="sm"
                              className="w-fit min-w-[112px] whitespace-nowrap"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedRowId(row.id);
                                handleDecision(row, "rejected");
                              }}
                            >
                              Reject
                            </Button>
                            {row.partner === null ? (
                              <Button
                                size="sm"
                                className="w-fit min-w-[112px] whitespace-nowrap"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedRowId(row.id);
                                  setManualLinkRowId(row.id);
                                }}
                              >
                                Link
                              </Button>
                            ) : null}
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

      <MergedDatasetSearchPanelSimple
        dataset={activeMergedSearchDataset}
        datasetLabel={mergedSearchLabel}
        rows={mergedSearchRows}
        headers={mergedSearchHeaders}
        onDownload={handleDownloadMergedSearch}
        onDatasetChange={setMergedSearchDatasetSelection}
        uploadState={mergedSearchState}
        onUploadFile={handleMergedSearchFile}
      />

      <Card className="space-y-6" data-tour="export-section">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 6: Export + run history</CardTitle>
          <p className="text-sm text-foreground/60">
            Download merged exports, build target lists, and save run snapshots for audit-ready demos.
          </p>
        </CardHeader>
        <CardContent>
          <AccountMappingExportsPanel
            hasMatches={hasMatches}
            mergedExportRowsLength={mergedExportRows.length}
            matchPairsLength={matchPairs.length}
            onDownloadMerged={handleDownloadMerged}
            targetRule={targetRule}
            setTargetRule={setTargetRule}
            statusOptions={statusOptions}
            targetRows={targetRows}
            targetPreview={targetPreview}
            onDownloadTargets={handleDownloadTargets}
            runHistory={runHistory}
            runHistoryStatus={runHistoryStatus}
            runHistoryError={runHistoryError}
            onSaveRunSnapshot={saveRunSnapshot}
            onOpenRun={handleOpenRun}
            latestComparableRun={latestComparableRun}
            diffSummary={diffSummary}
          />
        </CardContent>
      </Card>

      <AiReviewModal
        open={aiReview.aiReviewOpen}
        mode={aiReview.aiReviewMode}
        setMode={aiReview.setAiReviewMode}
        limit={aiReview.aiReviewLimit}
        setLimit={aiReview.setAiReviewLimit}
        isRunning={aiReview.aiReviewRunning}
        progress={aiReview.aiReviewProgress}
        targetCount={aiReview.aiTargetCount}
        runItems={aiReview.aiReviewRunItems}
        results={aiReview.aiReviewResults}
        rowById={reviewRowById}
        onRun={aiReview.runAiReview}
        onStop={aiReview.stopAiReview}
        onClose={() => {
          aiReview.stopAiReview();
          aiReview.setAiReviewOpen(false);
        }}
        onConfirm={(row) => {
          setSelectedRowId(row.id);
          handleDecision(row, "confirmed");
        }}
        onReject={(row) => {
          setSelectedRowId(row.id);
          handleDecision(row, "rejected");
        }}
      />

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
      {activeTourStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl space-y-4 rounded-xl border border-foreground/10 bg-background p-6 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-foreground/50">Walkthrough</p>
                <h2 className="text-lg font-semibold">{activeTourStep.title}</h2>
              </div>
              <Button variant="secondary" onClick={() => setTourStepIndex(null)}>
                Exit walkthrough
              </Button>
            </div>
            <p className="text-sm text-foreground/70">{activeTourStep.body}</p>
            {activeTourStep.highlight ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                {activeTourStep.highlight}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-foreground/60">
              <span>
                Step {tourStepIndex !== null ? tourStepIndex + 1 : 1} of {tourSteps.length}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={tourStepIndex === 0}
                  onClick={() =>
                    setTourStepIndex((prev) =>
                      prev === null ? prev : Math.max(prev - 1, 0),
                    )
                  }
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (tourStepIndex === null) {
                      return;
                    }
                    if (tourStepIndex >= tourSteps.length - 1) {
                      setTourStepIndex(null);
                      return;
                    }
                    setTourStepIndex(tourStepIndex + 1);
                  }}
                >
                  {tourStepIndex !== null && tourStepIndex >= tourSteps.length - 1
                    ? "Finish"
                    : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
