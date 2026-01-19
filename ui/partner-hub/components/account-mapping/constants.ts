import type { ReviewRowStatus } from "@/lib/account-mapping/decisionStore";

import type { AiVerdict } from "./types";

export const DEFAULT_PROGRESS_STEP = 2000;
export const MAX_PREVIEW_ROWS = 20;
export const SEARCH_PREVIEW_ROWS = 2000;
export const REVIEW_ROW_HEIGHT = 168;
export const REVIEW_LIST_HEIGHT = 560;

export const INPUT_BASE_CLASSES =
  "h-10 rounded-lg border border-border/70 bg-card px-3 text-sm text-foreground shadow-sm transition placeholder:text-foreground/40 focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const SIMPLE_SEARCH_COLUMNS = [
  "vendor_account_name",
  "partner_account_name",
  "vendor_owner",
  "partner_owner",
  "vendor_owner_email",
  "partner_owner_email",
  "vendor_status",
  "partner_status",
  "vendor_region",
  "partner_region",
  "vendor_organization",
  "partner_organization",
] as const;

export const SIMPLE_SEARCH_REQUIRED_UPLOAD_COLUMNS = [
  "vendor_account_name",
  "partner_account_name",
  "vendor_owner",
  "partner_owner",
] as const;

export const SIMPLE_SEARCH_ID_COLUMNS = ["vendor_crm_account_id", "partner_crm_account_id"] as const;
export const SIMPLE_SEARCH_HEADERS = [...SIMPLE_SEARCH_COLUMNS, ...SIMPLE_SEARCH_ID_COLUMNS];

export const STATUS_STYLES: Record<ReviewRowStatus, string> = {
  autoMatch: "bg-emerald-100 text-emerald-900",
  review: "bg-amber-100 text-amber-900",
  unmatched: "bg-slate-100 text-slate-700",
  confirmed: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
  manual: "bg-blue-100 text-blue-900",
};

export const AI_VERDICT_STYLES: Record<AiVerdict | "error", string> = {
  match: "bg-emerald-100 text-emerald-900",
  no_match: "bg-red-100 text-red-900",
  unsure: "bg-slate-100 text-slate-700",
  error: "bg-red-100 text-red-900",
};
