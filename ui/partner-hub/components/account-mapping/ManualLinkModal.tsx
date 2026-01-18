"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { INPUT_BASE_CLASSES } from "./constants";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import type { AccountRecord, ReviewRow } from "./types";

const ManualLinkModal = ({
  open,
  row,
  partnerOptions,
  onSelect,
  onClose,
}: {
  open: boolean;
  row: ReviewRow | null;
  partnerOptions: AccountRecord[];
  onSelect: (partner: AccountRecord) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

  const filteredPartners = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return partnerOptions.slice(0, 200);
    }
    return partnerOptions
      .filter((partner) => {
        return (
          partner.rawName.toLowerCase().includes(normalizedSearch) ||
          partner.normalizedName.toLowerCase().includes(normalizedSearch)
        );
      })
      .slice(0, 200);
  }, [debouncedSearch, partnerOptions]);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  if (!open || !row) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10">
      <div
        className="w-full max-w-2xl rounded-xl border border-foreground/10 bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-link-title"
      >
        <div className="flex items-center justify-between border-b border-foreground/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-foreground/50">Manual link</p>
            <p className="text-base font-semibold" id="manual-link-title">
              {row.vendor.rawName || "Unnamed account"}
            </p>
            <p className="text-xs text-foreground/60">Normalized: {row.vendor.normalizedName}</p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="text-sm font-medium" htmlFor="partner-search">
              Search partner accounts
            </label>
            <input
              id="partner-search"
              className={`mt-2 w-full ${INPUT_BASE_CLASSES}`}
              placeholder="Search partner list..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <p className="mt-1 text-xs text-foreground/60">
              Showing up to 200 matches. Use search to refine.
            </p>
          </div>
          <div className="max-h-72 overflow-auto rounded-lg border border-foreground/10">
            {filteredPartners.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-foreground/60">
                No partner accounts match your search.
              </p>
            ) : (
              <ul className="divide-y divide-foreground/10 text-sm">
                {filteredPartners.map((partner) => (
                  <li key={partner.id} className="flex items-center justify-between px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-medium">{partner.rawName || "Unnamed account"}</p>
                      <p className="text-xs text-foreground/60">
                        Normalized: {partner.normalizedName || "—"}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => onSelect(partner)}>
                      Link
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { ManualLinkModal };
