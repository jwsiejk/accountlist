"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { RunStats } from "../hooks/useCsvParseWorkers";
import { formatMs } from "../utils";

type AccountMappingStatsBarProps = {
  runStats: RunStats;
  statsOpen: boolean;
  onToggleStats: () => void;
};

export const AccountMappingStatsBar = ({
  runStats,
  statsOpen,
  onToggleStats,
}: AccountMappingStatsBarProps) => (
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
          onClick={onToggleStats}
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
);
