"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { MultiCombobox } from "@/components/ui/multiCombobox";

import { buildCsv, downloadCsv } from "@/lib/account-mapping/csv";
import { mergedAccountExportHeaders, type MergedAccountExportRow } from "@/lib/account-mapping/exportSchema";
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
import { resolveMergedSearchDataset, type MergedSearchDatasetSelection } from "@/lib/account-mapping/mergedSearchDataset";

import { INPUT_BASE_CLASSES, SEARCH_PREVIEW_ROWS, SIMPLE_SEARCH_COLUMNS, SIMPLE_SEARCH_REQUIRED_UPLOAD_COLUMNS } from "./constants";
import type { CsvParseState } from "./types";
import { FileDropzone } from "./FileDropzone";
import { PreviewTable } from "./PreviewTable";

const MergedDatasetSearchPanelSimple = ({
  dataset,
  datasetLabel,
  rows,
  headers,
  onDownload,
  onDatasetChange,
  uploadState,
  onUploadFile,
}: {
  dataset: MergedSearchDatasetSelection;
  datasetLabel: string;
  rows: MergedSearchRow[];
  headers: string[];
  onDownload: (rows: MergedSearchRow[], headers: string[]) => void;
  onDatasetChange: (next: MergedSearchDatasetSelection) => void;
  uploadState: CsvParseState;
  onUploadFile: (file: File) => void;
}) => {
  const [accountNamesFilter, setAccountNamesFilter] = useState<string[]>([]);
  const [vendorOwnerFilter, setVendorOwnerFilter] = useState("");
  const [vendorRegionFilter, setVendorRegionFilter] = useState("");
  const [vendorOrganizationFilter, setVendorOrganizationFilter] = useState("");
  const [vendorStatusFilter, setVendorStatusFilter] = useState("");
  const [partnerOwnerFilter, setPartnerOwnerFilter] = useState("");
  const [partnerRegionFilter, setPartnerRegionFilter] = useState("");
  const [partnerOrganizationFilter, setPartnerOrganizationFilter] = useState("");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState("");
  const [overlapOnly, setOverlapOnly] = useState(false);
  const [firstFilterKey, setFirstFilterKey] = useState<FilterKey | null>(null);
  const previousOwnersRef = useRef({ hasVendor: false, hasPartner: false });

  const hasVendorOwner = Boolean(vendorOwnerFilter);
  const hasPartnerOwner = Boolean(partnerOwnerFilter);

  useEffect(() => {
    const hasBothOwners = hasVendorOwner && hasPartnerOwner;
    const prev = previousOwnersRef.current;
    if (hasBothOwners && !(prev.hasVendor && prev.hasPartner)) {
      setOverlapOnly(true);
    }
    if (!hasBothOwners && prev.hasVendor && prev.hasPartner) {
      setOverlapOnly(false);
    }
    previousOwnersRef.current = { hasVendor: hasVendorOwner, hasPartner: hasPartnerOwner };
  }, [hasPartnerOwner, hasVendorOwner]);

  const availableColumns = useMemo(
    () => SIMPLE_SEARCH_COLUMNS.filter((column) => headers.includes(column)),
    [headers],
  );
  const hasVendorStatus = headers.includes("vendor_status");
  const hasPartnerStatus = headers.includes("partner_status");

  const missingUploadColumns = useMemo(() => {
    if (dataset !== "upload") {
      return [];
    }
    return SIMPLE_SEARCH_REQUIRED_UPLOAD_COLUMNS.filter(
      (column) => !headers.includes(column),
    );
  }, [dataset, headers]);

  const hasVendorAccount = (row: MergedSearchRow) =>
    Boolean(row.vendor_account_name?.trim());
  const hasPartnerAccount = (row: MergedSearchRow) =>
    Boolean(row.partner_account_name?.trim());

  const filterState = useMemo<MergedSearchFilterState>(
    () => ({
      accountNames: accountNamesFilter,
      vendorOwner: vendorOwnerFilter,
      vendorRegion: vendorRegionFilter,
      vendorOrganization: vendorOrganizationFilter,
      vendorStatus: vendorStatusFilter,
      partnerOwner: partnerOwnerFilter,
      partnerRegion: partnerRegionFilter,
      partnerOrganization: partnerOrganizationFilter,
      partnerStatus: partnerStatusFilter,
    }),
    [
      accountNamesFilter,
      partnerOrganizationFilter,
      partnerOwnerFilter,
      partnerRegionFilter,
      partnerStatusFilter,
      vendorOrganizationFilter,
      vendorOwnerFilter,
      vendorRegionFilter,
      vendorStatusFilter,
    ],
  );

  const activeFilterKeys = useMemo<FilterKey[]>(
    () => [
      accountNamesFilter.length > 0 ? "accountNames" : null,
      vendorOwnerFilter ? "vendorOwner" : null,
      vendorRegionFilter ? "vendorRegion" : null,
      vendorOrganizationFilter ? "vendorOrganization" : null,
      vendorStatusFilter ? "vendorStatus" : null,
      partnerOwnerFilter ? "partnerOwner" : null,
      partnerRegionFilter ? "partnerRegion" : null,
      partnerOrganizationFilter ? "partnerOrganization" : null,
      partnerStatusFilter ? "partnerStatus" : null,
    ].filter((value): value is FilterKey => value !== null),
    [
      accountNamesFilter.length,
      partnerOrganizationFilter,
      partnerOwnerFilter,
      partnerRegionFilter,
      partnerStatusFilter,
      vendorOrganizationFilter,
      vendorOwnerFilter,
      vendorRegionFilter,
      vendorStatusFilter,
    ],
  );

  useEffect(() => {
    if (!overlapOnly) {
      setFirstFilterKey(null);
      return;
    }
    if (activeFilterKeys.length === 0) {
      setFirstFilterKey(null);
      return;
    }
    if (firstFilterKey && activeFilterKeys.includes(firstFilterKey)) {
      return;
    }
    setFirstFilterKey(activeFilterKeys[0]);
  }, [activeFilterKeys, firstFilterKey, overlapOnly]);

  const baseRows = useMemo(
    () => buildBaseRows(rows, overlapOnly),
    [overlapOnly, rows],
  );

  const optionsFor = useMemo(
    () =>
      buildOptionsFor({
        rows: baseRows,
        filters: filterState,
        firstFilterKey: overlapOnly ? firstFilterKey : null,
      }),
    [baseRows, filterState, firstFilterKey, overlapOnly],
  );

  const optionsWithCounts = useMemo(
    () =>
      buildOptionsWithCounts({
        rows: baseRows,
        filters: filterState,
        firstFilterKey: overlapOnly ? firstFilterKey : null,
      }),
    [baseRows, filterState, firstFilterKey, overlapOnly],
  );

  useEffect(() => {
    const cleanedFilters = clearInvalidFilters(filterState, optionsFor);
    const hasAccountChanges =
      cleanedFilters.accountNames.length !== accountNamesFilter.length ||
      cleanedFilters.accountNames.some(
        (value, index) => value !== accountNamesFilter[index],
      );
    if (hasAccountChanges) {
      setAccountNamesFilter(cleanedFilters.accountNames);
    }
    if (cleanedFilters.vendorOwner !== vendorOwnerFilter) {
      setVendorOwnerFilter(cleanedFilters.vendorOwner);
    }
    if (cleanedFilters.vendorRegion !== vendorRegionFilter) {
      setVendorRegionFilter(cleanedFilters.vendorRegion);
    }
    if (cleanedFilters.vendorOrganization !== vendorOrganizationFilter) {
      setVendorOrganizationFilter(cleanedFilters.vendorOrganization);
    }
    if (cleanedFilters.vendorStatus !== vendorStatusFilter) {
      setVendorStatusFilter(cleanedFilters.vendorStatus);
    }
    if (cleanedFilters.partnerOwner !== partnerOwnerFilter) {
      setPartnerOwnerFilter(cleanedFilters.partnerOwner);
    }
    if (cleanedFilters.partnerRegion !== partnerRegionFilter) {
      setPartnerRegionFilter(cleanedFilters.partnerRegion);
    }
    if (cleanedFilters.partnerOrganization !== partnerOrganizationFilter) {
      setPartnerOrganizationFilter(cleanedFilters.partnerOrganization);
    }
    if (cleanedFilters.partnerStatus !== partnerStatusFilter) {
      setPartnerStatusFilter(cleanedFilters.partnerStatus);
    }
  }, [
    accountNamesFilter,
    filterState,
    optionsFor,
    partnerOrganizationFilter,
    partnerOwnerFilter,
    partnerRegionFilter,
    partnerStatusFilter,
    vendorOrganizationFilter,
    vendorOwnerFilter,
    vendorRegionFilter,
    vendorStatusFilter,
  ]);

  const isClearDisabled = useMemo(
    () => isFilterStateEmpty(filterState),
    [filterState],
  );
  const hasAnyFilters = useMemo(() => !isFilterStateEmpty(filterState), [filterState]);

  const handleClearAll = () => {
    const emptyFilters = createEmptyFilterState();
    setAccountNamesFilter(emptyFilters.accountNames);
    setVendorOwnerFilter(emptyFilters.vendorOwner);
    setVendorRegionFilter(emptyFilters.vendorRegion);
    setVendorOrganizationFilter(emptyFilters.vendorOrganization);
    setVendorStatusFilter(emptyFilters.vendorStatus);
    setPartnerOwnerFilter(emptyFilters.partnerOwner);
    setPartnerRegionFilter(emptyFilters.partnerRegion);
    setPartnerOrganizationFilter(emptyFilters.partnerOrganization);
    setPartnerStatusFilter(emptyFilters.partnerStatus);
    setFirstFilterKey(null);
  };

  const sections = useMemo(() => {
    if (!hasAnyFilters) {
      return [];
    }
    if (rows.length === 0 || missingUploadColumns.length > 0) {
      return [];
    }

    const isOverlap = (row: MergedSearchRow) => hasVendorAccount(row) && hasPartnerAccount(row);
    const isVendorOnly = (row: MergedSearchRow) =>
      hasVendorAccount(row) && !hasPartnerAccount(row);
    const isPartnerOnly = (row: MergedSearchRow) =>
      hasPartnerAccount(row) && !hasVendorAccount(row);
    const overlapRows = rows.filter(isOverlap);

    if (hasVendorOwner && hasPartnerOwner) {
      const shared = getEligibleRows({ rows: overlapRows, filters: filterState });
      if (overlapOnly) {
        return [{ id: "shared", title: "Shared accounts", rows: shared }];
      }
      const vendorOnly = getEligibleRows({
        rows,
        filters: {
          ...filterState,
          partnerOwner: "",
          partnerRegion: "",
          partnerOrganization: "",
          partnerStatus: "",
        },
      }).filter(isVendorOnly);
      const partnerOnly = getEligibleRows({
        rows,
        filters: {
          ...filterState,
          vendorOwner: "",
          vendorRegion: "",
          vendorOrganization: "",
          vendorStatus: "",
        },
      }).filter(isPartnerOnly);
      return [
        { id: "shared", title: "Shared accounts", rows: shared },
        { id: "vendor-only", title: "Vendor-only accounts", rows: vendorOnly },
        { id: "partner-only", title: "Partner-only accounts", rows: partnerOnly },
      ];
    }

    if (hasVendorOwner || hasPartnerOwner) {
      const side: "vendor" | "partner" = hasVendorOwner ? "vendor" : "partner";
      const results = getEligibleRows({
        rows: baseRows,
        filters: filterState,
        excludeKey: side === "vendor" ? "partnerOwner" : "vendorOwner",
      }).filter((row) => {
        if (side === "vendor" && !hasVendorAccount(row)) {
          return false;
        }
        if (side === "partner" && !hasPartnerAccount(row)) {
          return false;
        }
        return true;
      });
      return [{ id: "results", title: "Results", rows: results }];
    }

    const results = getEligibleRows({ rows: baseRows, filters: filterState });
    return [{ id: "results", title: "Results", rows: results }];
  }, [
    baseRows,
    filterState,
    hasAnyFilters,
    hasPartnerOwner,
    hasVendorOwner,
    missingUploadColumns.length,
    overlapOnly,
    rows,
  ]);

  const totalResults = useMemo(
    () => sections.reduce((sum, section) => sum + section.rows.length, 0),
    [sections],
  );

  const filteredDownloadRows = useMemo(
    () => sections.flatMap((section) => section.rows),
    [sections],
  );

  const renderFilterCombobox = (
    label: string,
    value: string,
    onChange: (next: string) => void,
    options: ComboboxOption[],
    placeholder: string,
    disabled = false,
  ) => {
    const optionsWithSelectAll: ComboboxOption[] = [
      { value: "", label: "Select All" },
      ...options,
    ];

    return (
      <div className="min-w-[180px] flex-1 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          {label}
        </label>
        <Combobox
          value={value}
          onChange={onChange}
          options={optionsWithSelectAll}
          placeholder={placeholder}
          disabled={disabled}
          emptyLabel="No matches"
        />
      </div>
    );
  };

  return (
    <Card className="space-y-6">
      <CardHeader className="gap-2">
        <CardTitle className="text-lg">Search merged dataset</CardTitle>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground/60">
          <span>Dataset: {datasetLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="merged-dataset-selector">
              Dataset selection
            </label>
            <select
              id="merged-dataset-selector"
              className={`w-full ${INPUT_BASE_CLASSES}`}
              value={dataset}
              onChange={(event) =>
                onDatasetChange(event.target.value as MergedSearchDatasetSelection)
              }
            >
              <option value="run">Current run</option>
              <option value="upload">Uploaded merged CSV</option>
            </select>
          </div>
          {dataset === "upload" && (
            <FileDropzone
              label="Merged CSV upload"
              description="Upload a merged CSV that matches the export schema."
              parseState={uploadState}
              onFileSelected={onUploadFile}
            />
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-foreground/60">
            {dataset === "upload"
              ? "Upload a merged CSV to start searching."
              : "No current run data available yet. Run a match or upload a merged CSV."}
          </p>
        ) : missingUploadColumns.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">This upload is missing required columns.</p>
            <p className="text-xs">
              Include: {missingUploadColumns.join(", ")}.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  Account
                </p>
                <MultiCombobox
                  values={accountNamesFilter}
                  onChange={setAccountNamesFilter}
                  options={optionsWithCounts.accountNames}
                  placeholder="Search accounts..."
                  emptyLabel="No matching accounts"
                  maxVisibleOptions={300}
                />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-[80px] pt-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    Vendor
                  </div>
                  <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {renderFilterCombobox(
                      "Owner",
                      vendorOwnerFilter,
                      setVendorOwnerFilter,
                      optionsWithCounts.vendorOwner,
                      "All vendor owners",
                    )}
                    {renderFilterCombobox(
                      "Region",
                      vendorRegionFilter,
                      setVendorRegionFilter,
                      optionsWithCounts.vendorRegion,
                      "All regions",
                    )}
                    {renderFilterCombobox(
                      "Organization",
                      vendorOrganizationFilter,
                      setVendorOrganizationFilter,
                      optionsWithCounts.vendorOrganization,
                      "All organizations",
                    )}
                    {renderFilterCombobox(
                      "Customer / Prospect",
                      vendorStatusFilter,
                      setVendorStatusFilter,
                      optionsWithCounts.vendorStatus,
                      hasVendorStatus ? "All statuses" : "Status unavailable",
                      !hasVendorStatus,
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-[80px] pt-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    Partner
                  </div>
                  <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {renderFilterCombobox(
                      "Owner",
                      partnerOwnerFilter,
                      setPartnerOwnerFilter,
                      optionsWithCounts.partnerOwner,
                      "All partner owners",
                    )}
                    {renderFilterCombobox(
                      "Region",
                      partnerRegionFilter,
                      setPartnerRegionFilter,
                      optionsWithCounts.partnerRegion,
                      "All regions",
                    )}
                    {renderFilterCombobox(
                      "Organization",
                      partnerOrganizationFilter,
                      setPartnerOrganizationFilter,
                      optionsWithCounts.partnerOrganization,
                      "All organizations",
                    )}
                    {renderFilterCombobox(
                      "Customer / Prospect",
                      partnerStatusFilter,
                      setPartnerStatusFilter,
                      optionsWithCounts.partnerStatus,
                      hasPartnerStatus ? "All statuses" : "Status unavailable",
                      !hasPartnerStatus,
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-medium">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={overlapOnly}
                  onChange={(event) => setOverlapOnly(event.target.checked)}
                />
                Overlap only
              </label>
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={handleClearAll}
                disabled={isClearDisabled}
              >
                Clear all
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-foreground/60">
              <span>
                Showing {totalResults.toLocaleString()} of {rows.length.toLocaleString()}
              </span>
              <Button
                size="sm"
                onClick={() => onDownload(filteredDownloadRows, headers)}
                disabled={filteredDownloadRows.length === 0}
              >
                Download filtered CSV
              </Button>
            </div>

            {!hasAnyFilters ? (
              <p className="text-sm text-foreground/60">
                Select an account, vendor filters, or partner filters to begin.
              </p>
            ) : sections.length === 0 ? (
              <p className="text-sm text-foreground/60">No rows match these filters.</p>
            ) : (
              <div className="space-y-6">
                {sections.map((section) => {
                  const visibleRows = section.rows.slice(0, SEARCH_PREVIEW_ROWS);
                  return (
                    <div key={section.id} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{section.title}</p>
                          <p className="text-xs text-foreground/60">
                            {section.rows.length.toLocaleString()} accounts
                          </p>
                        </div>
                        {section.rows.length > SEARCH_PREVIEW_ROWS && (
                          <span className="text-xs text-foreground/50">
                            Showing first {SEARCH_PREVIEW_ROWS.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {section.rows.length === 0 ? (
                        <p className="text-sm text-foreground/60">
                          No accounts in this section.
                        </p>
                      ) : availableColumns.length === 0 ? (
                        <p className="text-sm text-foreground/60">
                          No displayable columns found in this dataset.
                        </p>
                      ) : (
                        <PreviewTable headers={availableColumns} rows={visibleRows} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { MergedDatasetSearchPanelSimple };
