"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inferMappingFromHeaders } from "@/lib/account-mapping/inference";
import {
  createEmptyRawMapping,
  validateMapping,
  type RawAccountMapping,
} from "@/lib/account-mapping/schema";
import { buildCsv, downloadCsv } from "@/lib/account-mapping/csv";
import { TEMPLATE_STORAGE_KEY } from "@/lib/account-mapping/templateStorage";
import {
  mergedAccountExportHeaders,
  targetExportHeaders,
  type MergedAccountExportRow,
  type TargetExportRow,
} from "@/lib/account-mapping/exportSchema";
import { type MergedSearchRow } from "@/lib/account-mapping/mergedSearch";
import {
  buildBaseRows,
  buildOptionsFor,
  buildOptionsWithCounts,
  clearInvalidFilters,
  createEmptyFilterState,
  getEligibleRows,
  isFilterStateEmpty,
  type FilterKey,
  type MergedSearchFilterState,
} from "@/lib/account-mapping/mergedSearchFilters";
import {
  resolveMergedSearchDataset,
  type MergedSearchDatasetSelection,
} from "@/lib/account-mapping/mergedSearchDataset";
import {
  findLatestRunByFiles,
  saveRun,
  type AccountMappingRun,
  type MatchPairSnapshot,
  type StoredCsvSnapshot,
} from "@/lib/account-mapping/runHistory";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { MultiCombobox } from "@/components/ui/multiCombobox";
import { withBasePath } from "@/lib/basePath";

import { AiReviewModal } from "./AiReviewModal";
import {
  AI_VERDICT_STYLES,
  INPUT_BASE_CLASSES,
  MAX_PREVIEW_ROWS,
  REVIEW_LIST_HEIGHT,
  REVIEW_ROW_HEIGHT,
  SEARCH_PREVIEW_ROWS,
  SIMPLE_SEARCH_HEADERS,
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
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useMappingDecisions } from "./hooks/useMappingDecisions";
import { useMappingTemplates } from "./hooks/useMappingTemplates";
import { useRunHistory } from "./hooks/useRunHistory";
import type { CsvParseState, DiffSummary, TargetRuleMode, TargetRuleState, TourStep } from "./types";
import { buildCsvRows, buildCsvSnapshot, buildRunId, formatMs, isMappingEmpty } from "./utils";
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

  const statusOptions = useMemo(() => {
    const statusSet = new Set<string>();
    vendorRecords.forEach((record) => {
      const value = record.status?.trim();
      if (value) {
        statusSet.add(value);
      }
    });
    partnerRecords.forEach((record) => {
      const value = record.status?.trim();
      if (value) {
        statusSet.add(value);
      }
    });
    return Array.from(statusSet).sort((a, b) => a.localeCompare(b));
  }, [partnerRecords, vendorRecords]);

  const matchPairs = useMemo<MatchPairSnapshot[]>(
    () =>
      reviewRows
        .filter((row) => row.partnerAccountKey && row.status !== "rejected")
        .map((row) => ({
          vendorAccountKey: row.vendorAccountKey,
          partnerAccountKey: row.partnerAccountKey as string,
        })),
    [reviewRows],
  );

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

  const summary = modelStats;

  const autoMatchPercent = summary.total
    ? Math.round((summary.matched / summary.total) * 100)
    : 0;

  const mergedExportRows = useMemo<MergedAccountExportRow[]>(
    () =>
      reviewRows.map((row) => ({
        vendor_account_name: row.vendor.rawName ?? "",
        partner_account_name: row.partner?.rawName ?? "",
        vendor_owner: row.vendor.ownerName ?? "",
        vendor_manager: row.vendor.managerName ?? "",
        vendor_pam: row.vendor.pamName ?? "",
        partner_owner: row.partner?.ownerName ?? "",
        partner_manager: row.partner?.managerName ?? "",
        partner_pam: row.partner?.pamName ?? "",
        vendor_status: row.vendor.status ?? "",
        partner_status: row.partner?.status ?? "",
        match_score: row.matchScore !== null ? String(row.matchScore) : "",
        match_type: row.matchType ?? "",
        match_reasons: row.reasons.join("; "),
      })),
    [reviewRows],
  );

  const runSearchDataset = useMemo<MergedSearchRow[]>(
    () =>
      reviewRows.map((row) => ({
        vendor_account_name: row.vendor.rawName ?? "",
        partner_account_name: row.partner?.rawName ?? "",
        vendor_owner: row.vendor.ownerName ?? "",
        partner_owner: row.partner?.ownerName ?? "",
        vendor_status: row.vendor.status ?? "",
        partner_status: row.partner?.status ?? "",
        vendor_crm_account_id: row.vendor.crmAccountId ?? "",
        partner_crm_account_id: row.partner?.crmAccountId ?? "",
        vendor_region: row.vendor.region ?? "",
        partner_region: row.partner?.region ?? "",
        vendor_organization: row.vendor.organization ?? "",
        partner_organization: row.partner?.organization ?? "",
      })),
    [reviewRows],
  );
  const uploadedSearchRows = useMemo<MergedSearchRow[]>(
    () => (mergedSearchState.result?.rows ?? []) as MergedSearchRow[],
    [mergedSearchState.result],
  );
  const uploadedSearchHeaders = mergedSearchState.result?.headers ?? [];

  const hasRunDataset = runSearchDataset.length > 0;
  const hasUploadedDataset = uploadedSearchRows.length > 0;

  const activeMergedSearchDataset = useMemo(
    () =>
      resolveMergedSearchDataset(mergedSearchDatasetSelection, {
        hasRunDataset,
        hasUploadedDataset,
      }),
    [hasRunDataset, hasUploadedDataset, mergedSearchDatasetSelection],
  );

  useEffect(() => {
    if (
      activeMergedSearchDataset !== mergedSearchDatasetSelection &&
      !hasRunDataset &&
      hasUploadedDataset
    ) {
      setMergedSearchDatasetSelection(activeMergedSearchDataset);
    }
  }, [
    activeMergedSearchDataset,
    hasRunDataset,
    hasUploadedDataset,
    mergedSearchDatasetSelection,
  ]);

  const mergedSearchRows =
    activeMergedSearchDataset === "run" ? runSearchDataset : uploadedSearchRows;
  const mergedSearchHeaders =
    activeMergedSearchDataset === "run" ? SIMPLE_SEARCH_HEADERS : uploadedSearchHeaders;
  const mergedSearchLabel =
    activeMergedSearchDataset === "run" ? "Current run" : "Uploaded merged CSV";

  const targetRows = useMemo<TargetExportRow[]>(() => {
    if (!targetRule.mode) {
      return [];
    }

    return reviewRows
      .filter((row) => row.partnerAccountKey && row.status !== "rejected")
      .filter((row) => {
        const vendorStatus = row.vendor.status?.trim() ?? "";
        const partnerStatus = row.partner?.status?.trim() ?? "";

        if (targetRule.mode === "both") {
          if (!targetRule.vendorStatus || !targetRule.partnerStatus) {
            return false;
          }
          return (
            vendorStatus === targetRule.vendorStatus &&
            partnerStatus === targetRule.partnerStatus
          );
        }

        if (!targetRule.eitherStatus) {
          return false;
        }

        return (
          vendorStatus === targetRule.eitherStatus ||
          partnerStatus === targetRule.eitherStatus
        );
      })
      .map((row) => ({
        vendor_account_name: row.vendor.rawName ?? "",
        partner_account_name: row.partner?.rawName ?? "",
        vendor_status: row.vendor.status ?? "",
        partner_status: row.partner?.status ?? "",
        match_score: row.matchScore !== null ? String(row.matchScore) : "",
        match_type: row.matchType ?? "",
        match_reasons: row.reasons.join("; "),
      }));
  }, [reviewRows, targetRule]);

  const targetPreview = useMemo(() => targetRows.slice(0, 6), [targetRows]);

  const selectedRow = useMemo(
    () => reviewRows.find((row) => row.id === selectedRowId) ?? null,
    [reviewRows, selectedRowId],
  );

  const manualLinkRow = useMemo(
    () => reviewRows.find((row) => row.id === manualLinkRowId) ?? null,
    [manualLinkRowId, reviewRows],
  );

  const vendorFileName = vendorState.file?.name ?? "";
  const partnerFileName = partnerState.file?.name ?? "";

  const latestComparableRun = useMemo(() => {
    if (!vendorFileName || !partnerFileName) {
      return undefined;
    }
    return findLatestRunByFiles(runHistory, vendorFileName, partnerFileName);
  }, [partnerFileName, runHistory, vendorFileName]);

  const diffSummary = useMemo<DiffSummary | null>(() => {
    if (!latestComparableRun) {
      return null;
    }

    const currentMatchKeys = new Set(
      matchPairs.map((pair) => `${pair.vendorAccountKey}::${pair.partnerAccountKey}`),
    );
    const previousMatchKeys = new Set(
      latestComparableRun.matchPairs.map(
        (pair) => `${pair.vendorAccountKey}::${pair.partnerAccountKey}`,
      ),
    );

    let newMatches = 0;
    let removedMatches = 0;

    currentMatchKeys.forEach((key) => {
      if (!previousMatchKeys.has(key)) {
        newMatches += 1;
      }
    });

    previousMatchKeys.forEach((key) => {
      if (!currentMatchKeys.has(key)) {
        removedMatches += 1;
      }
    });

    const previousMatchedVendorKeys = new Set(
      latestComparableRun.matchPairs.map((pair) => pair.vendorAccountKey),
    );
    const currentUnmatchedVendorKeys = new Set(
      reviewRows
        .filter((row) => !row.partnerAccountKey || row.status === "rejected")
        .map((row) => row.vendorAccountKey),
    );

    let newlyUnmatched = 0;
    currentUnmatchedVendorKeys.forEach((key) => {
      if (previousMatchedVendorKeys.has(key)) {
        newlyUnmatched += 1;
      }
    });

    return { newMatches, removedMatches, newlyUnmatched };
  }, [latestComparableRun, matchPairs, reviewRows]);

  const hasUploads = Boolean(vendorState.result && partnerState.result);
  const hasMappings = vendorValidation.success && partnerValidation.success;
  const hasMatches = matchResults.length > 0;

  const currentStep = hasMatches ? 4 : hasMappings ? 2 : hasUploads ? 1 : 0;

  const tourSteps = useMemo<TourStep[]>(
    () => [
      {
        id: "intro",
        title: "Welcome to account mapping",
        body: "We’ll load a demo dataset and walk through how ops teams replace manual spreadsheet wrangling with a repeatable workflow.",
        highlight: "Story arc: ingest → auto-match → review → targets → export.",
        autoAdvance: true,
        canAdvance: !isDemoLoading,
      },
      {
        id: "upload",
        title: "Instant ingest, no uploads required",
        body: "Partner managers typically chase two exports that never align. We normalize them instantly and keep the UI responsive.",
        highlight: `Parsed in ${formatMs(runStats.vendorParseMs + runStats.partnerParseMs)} total.`,
        autoAdvance: true,
        canAdvance: hasUploads,
      },
      {
        id: "mapping",
        title: "Auto-mapped fields + reusable templates",
        body: "We infer canonical fields and let ops teams lock in mappings as templates for repeat runs.",
        highlight: hasMappings ? "Required fields mapped—ready to match." : "Waiting on required fields.",
        autoAdvance: true,
        canAdvance: hasMappings,
      },
      {
        id: "matching",
        title: "Matching engine reduces review volume",
        body: "We auto-score likely matches and funnel only ambiguous pairs into a focused review queue.",
        highlight: `Auto-matched ${autoMatchPercent}% • Review queue reduced by ${summary.matched}.`,
        autoAdvance: true,
        canAdvance: hasMatches,
      },
      {
        id: "review",
        title: "Human-in-the-loop review stays fast",
        body: "Approve, reject, or manually link accounts while keeping keyboard shortcuts for speed.",
        highlight: `${summary.needsReview} accounts need review. ${summary.unmatched} need manual linking.`,
        autoAdvance: true,
        canAdvance: hasMatches,
      },
      {
        id: "targets",
        title: "Target lists generated in seconds",
        body: "Ops can build cross-sell or expansion lists by combining vendor + partner lifecycle states.",
        highlight: `Targets generated: ${targetRows.length}.`,
        autoAdvance: true,
        canAdvance: targetRows.length > 0,
      },
      {
        id: "stats",
        title: "Run stats make the value visible",
        body: "Share parsing + matching performance with stakeholders for confidence and auditability.",
        highlight: `Match time ${formatMs(runStats.matchMs)} • Total ${formatMs(runStats.totalMs)}.`,
        autoAdvance: false,
        canAdvance: runStats.totalMs > 0,
      },
    ],
    [
      autoMatchPercent,
      hasMappings,
      hasMatches,
      hasUploads,
      isDemoLoading,
      runStats.matchMs,
      runStats.partnerParseMs,
      runStats.totalMs,
      runStats.vendorParseMs,
      summary.matched,
      summary.needsReview,
      summary.unmatched,
      targetRows.length,
    ],
  );

  const activeTourStep = tourStepIndex !== null ? tourSteps[tourStepIndex] : null;

  useEffect(() => {
    if (!activeTourStep || !activeTourStep.autoAdvance || !activeTourStep.canAdvance) {
      return;
    }
    if (tourStepIndex === null || tourStepIndex >= tourSteps.length - 1) {
      return;
    }
    const timer = window.setTimeout(() => {
      setTourStepIndex((prev) => {
        if (prev === null) {
          return prev;
        }
        return Math.min(prev + 1, tourSteps.length - 1);
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [activeTourStep, tourStepIndex, tourSteps.length]);

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
      buildCsvRows(mergedAccountExportHeaders, mergedExportRows),
    );
    downloadCsv("merged_accounts.csv", csv);
    await saveRunSnapshot();
  }, [mergedExportRows, saveRunSnapshot]);

  const handleDownloadTargets = useCallback(async () => {
    const csv = buildCsv(
      [...targetExportHeaders],
      buildCsvRows(targetExportHeaders, targetRows),
    );
    downloadCsv("targets.csv", csv);
    await saveRunSnapshot();
  }, [saveRunSnapshot, targetRows]);

  const handleDownloadMergedSearch = useCallback(
    (rows: MergedSearchRow[], headers: string[]) => {
      const csv = buildCsv(
        [...headers],
        buildCsvRows(headers, rows),
      );
      downloadCsv("merged_search.csv", csv);
    },
    [],
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
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Account Mapping</h1>
            <p className="max-w-2xl text-base text-foreground/70">
              Match partner + vendor accounts, reduce review queues, and generate target lists in minutes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={loadDemoDataset}
              disabled={isDemoLoading}
              aria-label="Load demo dataset"
              aria-busy={isDemoLoading}
            >
              {isDemoLoading ? "Loading demo…" : "Load demo dataset"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setTourStepIndex(0)}
              aria-label="Start guided tour"
              disabled={tourStepIndex !== null}
            >
              Start guided tour
            </Button>
          </div>
        </div>
        {demoError && (
          <p className="text-sm text-destructive" role="alert">
            {demoError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {["Upload", "Map", "Match", "Review", "Export"].map((step, index) => (
            <div
              key={step}
              className={`rounded-full px-3 py-1 shadow-sm ${
                index <= currentStep
                  ? "bg-primary text-foreground"
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
          <CardTitle className="text-lg">Run stats</CardTitle>
          <p className="text-sm text-foreground/60">
            Client-side performance for parsing + matching. Share these metrics in your demo recap.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <p className="text-sm font-medium">Last run timings</p>
              <p className="text-xs text-foreground/60">
                Tracks the current session only — no network calls or server logging.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStatsOpen((prev) => !prev)}
              aria-expanded={statsOpen}
              aria-controls="run-stats-drawer"
            >
              {statsOpen ? "Hide stats" : "View stats"}
            </Button>
          </div>
          {statsOpen && (
            <div
              id="run-stats-drawer"
              className="grid gap-3 rounded-lg border border-foreground/10 bg-muted/40 px-4 py-4 text-xs text-foreground/70 md:grid-cols-2"
            >
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Parse time</p>
                <p>Vendor CSV: {formatMs(runStats.vendorParseMs)}</p>
                <p>Partner CSV: {formatMs(runStats.partnerParseMs)}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Match time</p>
                <p>Matching engine: {formatMs(runStats.matchMs)}</p>
                <p>Total run time: {formatMs(runStats.totalMs)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="space-y-6">
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

      <Card className="space-y-6">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 3: Map columns</CardTitle>
          <p className="text-sm text-foreground/60">
            Required fields must be mapped before saving templates. Auto-mapping uses header inference.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <MappingTableCard
              title="Vendor mapping"
              headers={vendorHeaders}
              mapping={vendorMapping}
              setMapping={setVendorMapping}
              validation={vendorValidation}
            />
            <MappingTableCard
              title="Partner mapping"
              headers={partnerHeaders}
              mapping={partnerMapping}
              setMapping={setPartnerMapping}
              validation={partnerValidation}
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
              Upload both CSVs (or load the demo dataset) and map the account name field to generate
              matching results. Matches appear instantly once both lists are ready.
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

              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-[240px] flex-1">
                  <label className="text-sm font-medium" htmlFor="account-search">
                    Search accounts
                  </label>
                  <input
                    ref={searchInputRef}
                    id="account-search"
                    className={`mt-2 w-full ${INPUT_BASE_CLASSES}`}
                    placeholder="Search by account name or normalized name…"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                  <p className="mt-1 text-xs text-foreground/60">
                    Shortcut: <span className="font-semibold">/</span> focuses search.
                  </p>
                </div>
                <div className="self-start">
                  <label className="text-sm font-medium" htmlFor="decision-filter">
                    Decision filter
                  </label>
                  <select
                    id="decision-filter"
                    className={`mt-2 w-full ${INPUT_BASE_CLASSES}`}
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
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => aiReview.setAiReviewOpen(true)}
                    disabled={reviewRows.length === 0}
                  >
                    AI Review
                  </Button>
                  <span className="text-xs text-foreground/60">
                    Showing {filteredRows.length.toLocaleString()} of{" "}
                    {reviewRows.length.toLocaleString()}
                  </span>
                </div>
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

      <Card className="space-y-6">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">Step 5: Export + run history</CardTitle>
          <p className="text-sm text-foreground/60">
            Download merged exports, build target lists, and save run snapshots for audit-ready demos.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-foreground/10 bg-muted/40 px-4 py-4">
              <div>
                <p className="text-sm font-semibold">Merged accounts export</p>
                <p className="text-xs text-foreground/60">
                  Includes owner/manager/PAM fields, statuses, and match diagnostics.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/60">
                <span>Rows: {mergedExportRows.length.toLocaleString()}</span>
                <span>Matches: {matchPairs.length.toLocaleString()}</span>
              </div>
              <Button onClick={handleDownloadMerged} disabled={!hasMatches}>
                Download merged_accounts.csv
              </Button>
            </div>

            <div className="space-y-4 rounded-lg border border-foreground/10 bg-muted/40 px-4 py-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Target list builder</p>
                <p className="text-xs text-foreground/60">
                  Build rules like “vendor=Customer AND partner=Prospect” or “either side = Customer”.
                </p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium" htmlFor="target-rule-mode">
                  Rule mode
                </label>
                <select
                  id="target-rule-mode"
                  className={`w-full ${INPUT_BASE_CLASSES}`}
                  value={targetRule.mode}
                  onChange={(event) =>
                    setTargetRule((prev) => ({
                      ...prev,
                      mode: event.target.value as TargetRuleMode,
                    }))
                  }
                >
                  <option value="both">Vendor AND Partner status</option>
                  <option value="either">Either side status</option>
                </select>
              </div>
              {targetRule.mode === "both" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="target-vendor-status">
                      Vendor status
                    </label>
                    <select
                      id="target-vendor-status"
                      className={`w-full ${INPUT_BASE_CLASSES}`}
                      value={targetRule.vendorStatus}
                      onChange={(event) =>
                        setTargetRule((prev) => ({
                          ...prev,
                          vendorStatus: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select vendor status</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="target-partner-status">
                      Partner status
                    </label>
                    <select
                      id="target-partner-status"
                      className={`w-full ${INPUT_BASE_CLASSES}`}
                      value={targetRule.partnerStatus}
                      onChange={(event) =>
                        setTargetRule((prev) => ({
                          ...prev,
                          partnerStatus: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select partner status</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="target-either-status">
                    Either side status
                  </label>
                  <select
                    id="target-either-status"
                    className={`w-full ${INPUT_BASE_CLASSES}`}
                    value={targetRule.eitherStatus}
                    onChange={(event) =>
                      setTargetRule((prev) => ({
                        ...prev,
                        eitherStatus: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select status</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-foreground/60">
                <span>Live count: {targetRows.length.toLocaleString()}</span>
                <Button
                  size="sm"
                  onClick={handleDownloadTargets}
                  disabled={!hasMatches || targetRows.length === 0}
                >
                  Download targets.csv
                </Button>
              </div>
              {targetRows.length === 0 ? (
                <p className="text-xs text-foreground/60">
                  Choose statuses to see a live preview of target matches.
                </p>
              ) : (
                <div className="max-h-56 overflow-auto rounded-lg border border-foreground/10 bg-background">
                  <table className="min-w-full divide-y divide-foreground/10 text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-foreground/70">
                          Vendor
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground/70">
                          Partner
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground/70">
                          Vendor status
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground/70">
                          Partner status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/10">
                      {targetPreview.map((row) => (
                        <tr key={`${row.vendor_account_name}-${row.partner_account_name}`}>
                          <td className="px-3 py-2 text-foreground/70">
                            {row.vendor_account_name}
                          </td>
                          <td className="px-3 py-2 text-foreground/70">
                            {row.partner_account_name}
                          </td>
                          <td className="px-3 py-2 text-foreground/70">
                            {row.vendor_status}
                          </td>
                          <td className="px-3 py-2 text-foreground/70">
                            {row.partner_status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-foreground/10 bg-muted/40 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Run history</p>
                  <p className="text-xs text-foreground/60">
                    Save a snapshot to reopen the exact mapping results later.
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={saveRunSnapshot} disabled={!hasMatches}>
                  Save run snapshot
                </Button>
              </div>
              {runHistoryStatus === "loading" && (
                <p className="text-xs text-foreground/60">Loading run history…</p>
              )}
              {runHistoryStatus === "error" && runHistoryError && (
                <p className="text-xs text-destructive">{runHistoryError}</p>
              )}
              {runHistoryStatus !== "loading" && runHistory.length === 0 && (
                <p className="text-xs text-foreground/60">No saved runs yet.</p>
              )}
              {runHistory.length > 0 && (
                <ul className="space-y-3">
                  {runHistory.slice(0, 5).map((run) => (
                    <li key={run.runId} className="rounded-lg border border-foreground/10 bg-background px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1 text-xs text-foreground/60">
                          <p className="text-sm font-semibold text-foreground">
                            {run.vendorFileName} + {run.partnerFileName}
                          </p>
                          <p>{new Date(run.timestamp).toLocaleString()}</p>
                          <p>
                            Rows: {run.rowCounts.vendor.toLocaleString()} vendor /{" "}
                            {run.rowCounts.partner.toLocaleString()} partner • Matches:{" "}
                            {run.rowCounts.matches.toLocaleString()} • Targets:{" "}
                            {run.rowCounts.targets.toLocaleString()}
                          </p>
                          {run.templateName ? <p>Template: {run.templateName}</p> : null}
                        </div>
                        <Button size="sm" onClick={() => handleOpenRun(run)}>
                          Reopen
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-foreground/10 bg-muted/40 px-4 py-4">
              <p className="text-sm font-semibold">Diff since last run</p>
              {latestComparableRun ? (
                <div className="space-y-2 text-xs text-foreground/60">
                  <p>
                    Comparing against {new Date(latestComparableRun.timestamp).toLocaleString()} for{" "}
                    {latestComparableRun.vendorFileName} + {latestComparableRun.partnerFileName}.
                  </p>
                  {diffSummary ? (
                    <ul className="space-y-1">
                      <li>New matches: {diffSummary.newMatches.toLocaleString()}</li>
                      <li>Removed matches: {diffSummary.removedMatches.toLocaleString()}</li>
                      <li>Newly unmatched: {diffSummary.newlyUnmatched.toLocaleString()}</li>
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-foreground/60">
                  Save at least one run with these filenames to see diff stats.
                </p>
              )}
            </div>
          </div>
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
                <p className="text-xs uppercase tracking-wide text-foreground/50">Guided tour</p>
                <h2 className="text-lg font-semibold">{activeTourStep.title}</h2>
              </div>
              <Button variant="secondary" onClick={() => setTourStepIndex(null)}>
                Exit tour
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
