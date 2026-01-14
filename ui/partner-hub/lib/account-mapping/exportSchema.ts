import { z } from "zod";

export const mergedAccountExportHeaders = [
  "vendor_account_name",
  "partner_account_name",
  "vendor_owner",
  "vendor_manager",
  "vendor_pam",
  "partner_owner",
  "partner_manager",
  "partner_pam",
  "vendor_status",
  "partner_status",
  "match_score",
  "match_type",
  "match_reasons",
] as const;

export const mergedAccountExportSchema = z.object({
  vendor_account_name: z.string(),
  partner_account_name: z.string(),
  vendor_owner: z.string(),
  vendor_manager: z.string(),
  vendor_pam: z.string(),
  partner_owner: z.string(),
  partner_manager: z.string(),
  partner_pam: z.string(),
  vendor_status: z.string(),
  partner_status: z.string(),
  match_score: z.string(),
  match_type: z.string(),
  match_reasons: z.string(),
});

export type MergedAccountExportRow = z.infer<typeof mergedAccountExportSchema>;

export const targetExportHeaders = [
  "vendor_account_name",
  "partner_account_name",
  "vendor_status",
  "partner_status",
  "match_score",
  "match_type",
  "match_reasons",
] as const;

export const targetExportSchema = z.object({
  vendor_account_name: z.string(),
  partner_account_name: z.string(),
  vendor_status: z.string(),
  partner_status: z.string(),
  match_score: z.string(),
  match_type: z.string(),
  match_reasons: z.string(),
});

export type TargetExportRow = z.infer<typeof targetExportSchema>;
