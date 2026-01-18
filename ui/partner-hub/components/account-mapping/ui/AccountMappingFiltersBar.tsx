"use client";

import type { RefObject } from "react";

import { Button } from "@/components/ui/button";

import { INPUT_BASE_CLASSES } from "../constants";

type AccountMappingFiltersSummary = {
  matched: number;
  needsReview: number;
  unmatched: number;
  total: number;
};

type AccountMappingFiltersBarProps = {
  searchInputRef: RefObject<HTMLInputElement>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  decisionFilter: "all" | "pending" | "decided";
  onDecisionFilterChange: (value: "all" | "pending" | "decided") => void;
  activeTab: "auto" | "review" | "unmatched";
  onTabChange: (value: "auto" | "review" | "unmatched") => void;
  summary: AccountMappingFiltersSummary;
  filteredRowsCount: number;
  totalRowsCount: number;
  onOpenAiReview: () => void;
  aiReviewDisabled: boolean;
};

export const AccountMappingFiltersBar = ({
  searchInputRef,
  searchTerm,
  onSearchTermChange,
  decisionFilter,
  onDecisionFilterChange,
  activeTab,
  onTabChange,
  summary,
  filteredRowsCount,
  totalRowsCount,
  onOpenAiReview,
  aiReviewDisabled,
}: AccountMappingFiltersBarProps) => (
  <>
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
          onChange={(event) => onSearchTermChange(event.target.value)}
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
            onDecisionFilterChange(event.target.value as "all" | "pending" | "decided")
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
          onClick={() => onTabChange("auto")}
        >
          Auto ({summary.matched.toLocaleString()})
        </Button>
        <Button
          variant={activeTab === "review" ? "default" : "secondary"}
          onClick={() => onTabChange("review")}
        >
          Review ({summary.needsReview.toLocaleString()})
        </Button>
        <Button
          variant={activeTab === "unmatched" ? "default" : "secondary"}
          onClick={() => onTabChange("unmatched")}
        >
          Unmatched ({summary.unmatched.toLocaleString()})
        </Button>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onOpenAiReview} disabled={aiReviewDisabled}>
          AI Review
        </Button>
        <span className="text-xs text-foreground/60">
          Showing {filteredRowsCount.toLocaleString()} of {totalRowsCount.toLocaleString()}
        </span>
      </div>
    </div>
  </>
);
