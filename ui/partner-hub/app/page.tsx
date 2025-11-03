"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import linksData from "@/data/links.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RestrictedLink } from "@/components/restricted-link";
import { EventsMini } from "@/components/events-mini";

type LinkRecord = { label: string; href: string; type: "internal" | "external"; restricted?: boolean };
type RoleKey = "sales" | "engineering" | "marketing" | "alliances";
type RoleFilter = RoleKey | "all";
type QuickLink = LinkRecord & { role: RoleKey };
type GroupedLinks = Record<RoleKey, LinkRecord[]>;

const groupedLinks = linksData as GroupedLinks;
const quickLinks = (Object.entries(groupedLinks) as [RoleKey, LinkRecord[]][]).flatMap(([role, items]) =>
  items.map((item) => ({ ...item, role })),
);
const roleLabels: Record<RoleKey, string> = {
  sales: "Sales",
  engineering: "SE",
  marketing: "Marketing",
  alliances: "Alliances",
};
const curatedAllLabels = new Set([
  "Pure Account Team Search",
  "Pipeline Report",
  "Asset Report",
  "Events Calendar",
  "Energy App",
]);
const curatedAll = quickLinks.filter((link) => curatedAllLabels.has(link.label));
const quickLinksByRole: Record<RoleKey, QuickLink[]> = {
  sales: quickLinks.filter((link) => link.role === "sales"),
  engineering: quickLinks.filter((link) => link.role === "engineering"),
  marketing: quickLinks.filter((link) => link.role === "marketing"),
  alliances: quickLinks.filter((link) => link.role === "alliances"),
};
const rolePills: { key: RoleFilter; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "engineering", label: "SE" },
  { key: "marketing", label: "Marketing" },
  { key: "alliances", label: "Alliances" },
  { key: "all", label: "All" },
];

export default function HomePage() {
  const [activeRole, setActiveRole] = useState<RoleFilter>("all");
  const visibleLinks = activeRole === "all" ? curatedAll : quickLinksByRole[activeRole];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-10 shadow-sm dark:via-slate-900">
        <p className="text-sm font-medium text-primary">Partner Hub</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Empower every Trace3 × Pure alliance engagement</h1>
        <p className="mt-4 max-w-2xl text-base text-foreground/70">
          Stay aligned across sales, marketing, engineering, and leadership with quick access to the resources you need—even when you are offline.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <span className="text-xs uppercase tracking-wide text-foreground/50">{visibleLinks.length} curated shortcuts</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {rolePills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setActiveRole(pill.key)}
              className={`rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                activeRole === pill.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-foreground/70 hover:text-foreground"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleLinks.map((link) => (
            <Card key={link.label}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <div>
                    <p>{link.label}</p>
                    <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{roleLabels[link.role]}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-foreground/40" aria-hidden />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">
                  {link.type === "external" ? "External resource" : "Internal link"}
                  {link.restricted ? " • Restricted" : ""}
                </span>
                <RestrictedLink link={link}>
                  <Link
                    href={link.href}
                    target={link.type === "external" ? "_blank" : undefined}
                    rel={link.type === "external" ? "noreferrer" : undefined}
                    className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                  >
                    Open
                  </Link>
                </RestrictedLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <EventsMini />
      </section>
    </div>
  );
}
