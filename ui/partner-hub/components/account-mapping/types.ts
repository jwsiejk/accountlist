import type { MatchResult, MatchType } from "@/lib/account-mapping/match";
import type { ReviewRowStatus } from "@/lib/account-mapping/decisionStore";

export type CsvParseResult = {
  headers: string[];
  sampleRows: Record<string, string>[];
  rows: Record<string, string>[];
  rowCount: number;
  inferredDelimiter: string;
  parseWarnings?: string[];
};

export type CsvParseState = {
  file: File | null;
  status: "idle" | "parsing" | "ready" | "error";
  progressRows: number;
  progressBytes: number;
  result: CsvParseResult | null;
  error?: string;
};

export type AccountRecord = {
  id: string;
  accountKey: string;
  rawName: string;
  normalizedName: string;
  ownerName?: string;
  ownerEmail?: string;
  managerName?: string;
  pamName?: string;
  status?: string;
  segmentType?: string;
  region?: string;
  organization?: string;
  crmAccountId?: string;
};

export type ReviewRow = {
  id: string;
  vendor: AccountRecord;
  partner: AccountRecord | null;
  vendorAccountKey: string;
  partnerAccountKey: string | null;
  normalizedName: string;
  matchScore: number | null;
  matchType: MatchType | null;
  status: ReviewRowStatus;
  baseStatus: MatchResult["status"];
  reasons: string[];
};

export type AiVerdict = "match" | "no_match" | "unsure";

export type AiResult = {
  verdict: AiVerdict;
  confidence: number;
  reason?: string;
  model?: string;
  latencyMs?: number;
  error?: string;
};

export type AiReviewMode = "validateMatched" | "review";

export type AiReviewItem = {
  key: string;
  rowId: string;
};

export type TargetRuleMode = "both" | "either";

export type TargetRuleState = {
  mode: TargetRuleMode;
  vendorStatus: string;
  partnerStatus: string;
  eitherStatus: string;
};

export type DiffSummary = {
  newMatches: number;
  removedMatches: number;
  newlyUnmatched: number;
};

export type TourStep = {
  id: string;
  title: string;
  body: string;
  highlight?: string;
  targetId: string;
  fallbackTargetId?: string;
  onEnter?: () => void;
};
