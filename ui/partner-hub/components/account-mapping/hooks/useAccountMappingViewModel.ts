"use client";

import { useCallback, useEffect, useMemo } from "react";

import {
  mergedAccountExportHeaders,
  targetExportHeaders,
  type MergedAccountExportRow,
  type TargetExportRow,
} from "@/lib/account-mapping/exportSchema";
import type { CsvRows } from "@/lib/account-mapping/csv";
import type { MergedSearchRow } from "@/lib/account-mapping/mergedSearch";
import {
  resolveMergedSearchDataset,
  type MergedSearchDatasetSelection,
} from "@/lib/account-mapping/mergedSearchDataset";
import {
  findLatestRunByFiles,
  type AccountMappingRun,
  type MatchPairSnapshot,
} from "@/lib/account-mapping/runHistory";

import { SIMPLE_SEARCH_HEADERS } from "../constants";
import type {
  AccountRecord,
  CsvParseState,
  DiffSummary,
  ReviewRow,
  TargetRuleState,
} from "../types";
import { buildCsvRows } from "../utils";
import { useDebouncedValue } from "./useDebouncedValue";

export type AccountMappingViewModel = {
  reviewRowById: Map<string, ReviewRow>;
  filteredRows: ReviewRow[];
  statusOptions: string[];
  matchPairs: MatchPairSnapshot[];
  mergedExportRows: MergedAccountExportRow[];
  mergedExportCsvRows: CsvRows;
  targetRows: TargetExportRow[];
  targetPreview: TargetExportRow[];
  targetExportCsvRows: CsvRows;
  activeMergedSearchDataset: MergedSearchDatasetSelection;
  mergedSearchRows: MergedSearchRow[];
  mergedSearchHeaders: string[];
  mergedSearchLabel: string;
  latestComparableRun?: AccountMappingRun;
  diffSummary: DiffSummary | null;
  buildMergedSearchCsvRows: (rows: MergedSearchRow[], headers: string[]) => CsvRows;
};

type AccountMappingViewModelArgs = {
  reviewRows: ReviewRow[];
  reviewRowById: Map<string, ReviewRow>;
  runHistory: AccountMappingRun[];
  vendorFileName: string;
  partnerFileName: string;
  activeTab: "auto" | "review" | "unmatched";
  decisionFilter: "all" | "pending" | "decided";
  searchTerm: string;
  targetRule: TargetRuleState;
  mergedSearchDatasetSelection: MergedSearchDatasetSelection;
  setMergedSearchDatasetSelection: (value: MergedSearchDatasetSelection) => void;
  mergedSearchState: CsvParseState;
  vendorRecords: AccountRecord[];
  partnerRecords: AccountRecord[];
};

export const useAccountMappingViewModel = ({
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
}: AccountMappingViewModelArgs): AccountMappingViewModel => {
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

  const mergedExportCsvRows = useMemo(
    () => buildCsvRows(mergedAccountExportHeaders, mergedExportRows),
    [mergedExportRows],
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
    setMergedSearchDatasetSelection,
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

  const targetExportCsvRows = useMemo(
    () => buildCsvRows(targetExportHeaders, targetRows),
    [targetRows],
  );

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

  const buildMergedSearchCsvRows = useCallback(
    (rows: MergedSearchRow[], headers: string[]) => buildCsvRows(headers, rows),
    [],
  );

  return {
    reviewRowById,
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
  };
};
