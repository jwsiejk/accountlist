"use client";

import { useEffect, useMemo, useState } from "react";
import groupedLinks from "@/data/links.json";

type LinkRecord = {
  label: string;
  href: string;
  type: "internal" | "external";
  restricted?: boolean;
};

type GroupedLinks = Record<string, LinkRecord[]>;

export type OmniLink = LinkRecord & {
  role: string;
};

const registry: OmniLink[] = Object.entries(groupedLinks as GroupedLinks).flatMap(
  ([role, items]) =>
    items.map((item) => ({
      ...item,
      role,
    })),
);

export function useOmniSearch(limit = 8) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 150);

    return () => window.clearTimeout(handle);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery) {
      return registry.slice(0, limit);
    }

    return registry
      .filter((item) =>
        [item.label, item.role, item.type]
          .join(" ")
          .toLowerCase()
          .includes(debouncedQuery),
      )
      .slice(0, limit);
  }, [debouncedQuery, limit]);

  return {
    query,
    setQuery,
    results,
    clear: () => setQuery(""),
  };
}

export { registry as omniRegistry };
