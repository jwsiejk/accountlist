import { useMemo } from "react";

import { applyDecisionsToRows, type MappingDecision } from "@/lib/account-mapping/decisionStore";
import { matchAccounts, type MatchResult } from "@/lib/account-mapping/match";
import { normalizeName } from "@/lib/account-mapping/normalize";
import { normalizeMapping, type RawAccountMapping } from "@/lib/account-mapping/schema";

import type { AccountRecord, CsvParseResult, ReviewRow } from "../types";

type AccountMappingModelOptions = {
  vendorParseResult: CsvParseResult | null;
  partnerParseResult: CsvParseResult | null;
  vendorMapping: RawAccountMapping;
  partnerMapping: RawAccountMapping;
  decisions: MappingDecision[];
};

type AccountMappingModelStats = {
  total: number;
  matched: number;
  needsReview: number;
  unmatched: number;
};

type AccountMappingModelTimings = {
  matchMs: number;
};

type AccountMappingModel = {
  vendorRecords: AccountRecord[];
  partnerRecords: AccountRecord[];
  vendorById: Map<string, AccountRecord>;
  partnerById: Map<string, AccountRecord>;
  partnerByAccountKey: Map<string, AccountRecord>;
  matchResults: MatchResult[];
  baseReviewRows: ReviewRow[];
  reviewRows: ReviewRow[];
  reviewRowById: Map<string, ReviewRow>;
  modelStats: AccountMappingModelStats;
  timings: AccountMappingModelTimings;
};

const buildAccountRecords = (
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
      ownerEmail: mapping.owner_email ? row[mapping.owner_email] ?? "" : "",
      managerName: mapping.manager_name ? row[mapping.manager_name] ?? "" : "",
      pamName: mapping.pam_name ? row[mapping.pam_name] ?? "" : "",
      status: mapping.status ? row[mapping.status] ?? "" : "",
      segmentType: mapping.segment_type ? row[mapping.segment_type] ?? "" : "",
      region: mapping.region ? row[mapping.region] ?? "" : "",
      organization: mapping.organization ? row[mapping.organization] ?? "" : "",
      crmAccountId: crmAccountId || undefined,
    };
  });
};

export const useAccountMappingModel = ({
  vendorParseResult,
  partnerParseResult,
  vendorMapping,
  partnerMapping,
  decisions,
}: AccountMappingModelOptions): AccountMappingModel => {
  const normalizedVendorMapping = useMemo(() => normalizeMapping(vendorMapping), [vendorMapping]);
  const normalizedPartnerMapping = useMemo(
    () => normalizeMapping(partnerMapping),
    [partnerMapping],
  );

  const vendorRecords = useMemo(() => {
    const vendorRows = vendorParseResult?.rows ?? [];
    return buildAccountRecords(vendorRows, normalizedVendorMapping, "vendor");
  }, [normalizedVendorMapping, vendorParseResult?.rows]);

  const partnerRecords = useMemo(() => {
    const partnerRows = partnerParseResult?.rows ?? [];
    return buildAccountRecords(partnerRows, normalizedPartnerMapping, "partner");
  }, [normalizedPartnerMapping, partnerParseResult?.rows]);

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

  const matchComputation = useMemo(() => {
    if (vendorRecords.length === 0 || partnerRecords.length === 0) {
      return { results: [], durationMs: 0 };
    }
    const startTime = performance.now();
    const results = matchAccounts(
      vendorRecords.map((record) => ({ id: record.id, name: record.rawName })),
      partnerRecords.map((record) => ({ id: record.id, name: record.rawName })),
    );
    const durationMs = performance.now() - startTime;
    return { results, durationMs };
  }, [vendorRecords, partnerRecords]);

  const matchResults = useMemo(() => matchComputation.results, [matchComputation.results]);

  const baseReviewRows = useMemo(() => {
    return matchResults
      .map<ReviewRow | null>((result) => {
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
        } as ReviewRow;
      })
      .filter((row): row is ReviewRow => row !== null);
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

  const reviewRowById = useMemo(() => new Map(reviewRows.map((row) => [row.id, row])), [reviewRows]);

  const modelStats = useMemo<AccountMappingModelStats>(() => {
    const total = reviewRows.length;
    const matched = reviewRows.filter((row) => row.baseStatus === "autoMatch").length;
    const needsReview = reviewRows.filter((row) => row.baseStatus === "review").length;
    const unmatched = reviewRows.filter((row) => row.baseStatus === "unmatched").length;
    return { total, matched, needsReview, unmatched };
  }, [reviewRows]);

  return {
    vendorRecords,
    partnerRecords,
    vendorById,
    partnerById,
    partnerByAccountKey,
    matchResults,
    baseReviewRows,
    reviewRows,
    reviewRowById,
    modelStats,
    timings: { matchMs: matchComputation.durationMs },
  };
};
