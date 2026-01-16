"use client";

import { useMemo, useState } from "react";
import { caseStudies } from "@/data/case-studies";
import { CaseStudyCard } from "@/components/case-studies/CaseStudyCard";

const filters = [
  { label: "All", value: "all" },
  { label: "Healthcare", value: "healthcare" },
  { label: "Cyber Recovery", value: "cyber recovery" },
  { label: "AI / Imaging", value: "ai / imaging" },
  { label: "Storage Refresh", value: "storage refresh" },
];

const normalize = (value: string) => value.toLowerCase();

const matchesFilter = (filter: string, caseStudy: (typeof caseStudies)[number]) => {
  if (filter === "all") {
    return true;
  }

  const industry = normalize(caseStudy.industry);
  const workloads = caseStudy.workloads.map(normalize);
  const tags = caseStudy.tags.map(normalize);

  switch (filter) {
    case "healthcare":
      return industry.includes("healthcare");
    case "cyber recovery":
      return tags.includes("cyber recovery");
    case "ai / imaging":
      return (
        tags.some((tag) => tag.includes("ai") || tag.includes("imaging")) ||
        workloads.some((workload) => workload.includes("imaging"))
      );
    case "storage refresh":
      return tags.some(
        (tag) => tag.includes("refresh") || tag.includes("storage refresh")
      );
    default:
      return true;
  }
};

export default function CaseStudiesPage() {
  const [activeFilter, setActiveFilter] = useState(filters[0].value);

  const filteredCaseStudies = useMemo(
    () => caseStudies.filter((caseStudy) => matchesFilter(activeFilter, caseStudy)),
    [activeFilter]
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Case Studies</h1>
        <p className="text-sm text-foreground/70">
          Proof points and outcomes from recent data center infrastructure engagements.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = filter.value === activeFilter;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm motion-reduce:transition-none ${
                isActive
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/70 text-foreground/60 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCaseStudies.map((study) => (
          <CaseStudyCard key={study.slug} caseStudy={study} />
        ))}
      </div>
    </section>
  );
}
