"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";

import type { AccountMappingRun } from "@/lib/account-mapping/runHistory";

import { INPUT_BASE_CLASSES } from "../constants";
import type { TargetExportRow } from "@/lib/account-mapping/exportSchema";

import type { DiffSummary, TargetRuleMode, TargetRuleState } from "../types";

type AccountMappingExportsPanelProps = {
  hasMatches: boolean;
  mergedExportRowsLength: number;
  matchPairsLength: number;
  onDownloadMerged: () => void;
  targetRule: TargetRuleState;
  setTargetRule: Dispatch<SetStateAction<TargetRuleState>>;
  statusOptions: string[];
  targetRows: TargetExportRow[];
  targetPreview: TargetExportRow[];
  onDownloadTargets: () => void;
  runHistory: AccountMappingRun[];
  runHistoryStatus: "idle" | "loading" | "ready" | "error";
  runHistoryError: string | null;
  onSaveRunSnapshot: () => void;
  onOpenRun: (run: AccountMappingRun) => void;
  latestComparableRun?: AccountMappingRun;
  diffSummary: DiffSummary | null;
};

export const AccountMappingExportsPanel = ({
  hasMatches,
  mergedExportRowsLength,
  matchPairsLength,
  onDownloadMerged,
  targetRule,
  setTargetRule,
  statusOptions,
  targetRows,
  targetPreview,
  onDownloadTargets,
  runHistory,
  runHistoryStatus,
  runHistoryError,
  onSaveRunSnapshot,
  onOpenRun,
  latestComparableRun,
  diffSummary,
}: AccountMappingExportsPanelProps) => (
  <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border border-foreground/10 bg-muted/40 px-4 py-4">
        <div>
          <p className="text-sm font-semibold">Merged accounts export</p>
          <p className="text-xs text-foreground/60">
            Includes owner/manager/PAM fields, statuses, and match diagnostics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/60">
          <span>Rows: {mergedExportRowsLength.toLocaleString()}</span>
          <span>Matches: {matchPairsLength.toLocaleString()}</span>
        </div>
        <Button onClick={onDownloadMerged} disabled={!hasMatches}>
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
            onClick={onDownloadTargets}
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
                  <th className="px-3 py-2 text-left font-semibold text-foreground/70">Vendor</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground/70">Partner</th>
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
                    <td className="px-3 py-2 text-foreground/70">{row.vendor_account_name}</td>
                    <td className="px-3 py-2 text-foreground/70">{row.partner_account_name}</td>
                    <td className="px-3 py-2 text-foreground/70">{row.vendor_status}</td>
                    <td className="px-3 py-2 text-foreground/70">{row.partner_status}</td>
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
          <Button size="sm" variant="secondary" onClick={onSaveRunSnapshot} disabled={!hasMatches}>
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
              <li
                key={run.runId}
                className="rounded-lg border border-foreground/10 bg-background px-3 py-3"
              >
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
                  <Button size="sm" onClick={() => onOpenRun(run)}>
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
  </div>
);
