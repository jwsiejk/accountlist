"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

export function LeftNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const aiInterviewEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_INTERVIEW === "true";
  const hpcLabEnabled = process.env.NEXT_PUBLIC_ENABLE_HPC_LAB === "true";
  const toolLinks = [
    { name: "Energy Tool", href: "/tools/energy" },
    { name: "AI Workload Mapper", href: "/tools/workload-mapper" },
    ...(aiInterviewEnabled ? [{ name: "AI Interview", href: "/tools/interview" }] : []),
  ];
  const links = [
    { name: "Home", href: "/" },
    { name: "Case Studies", href: "/case-studies" },
    { name: "Account Mapping", href: "/accountmap" },
    { name: "Job Hunter", href: "/job-hunter" },
    ...(hpcLabEnabled ? [{ name: "HPC Lab", href: "/hpc-lab" }] : []),
    ...toolLinks,
    { name: "Office Schedule", href: "/offices/schedule" },
    { name: "About / Contact", href: "/about" },
  ];

  return (
    <aside
      className={clsx(
        "flex h-full flex-col border-r border-border/60 bg-white/70 backdrop-blur transition-all dark:bg-slate-900/70",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <button
        className="flex items-center justify-between px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/50"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        <span className={clsx("flex items-center gap-2", collapsed && "hidden")}>Navigation</span>
        {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
      <nav className="flex flex-1 flex-col gap-1 px-2 pb-6">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const baseClasses = clsx(
            "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:bg-muted/60",
            active
              ? "border-primary bg-primary/10 text-foreground shadow-sm"
              : "text-foreground/70",
            collapsed && "justify-center border-l-0 px-0",
          );

          return (
            <Link key={link.name} href={link.href} className={baseClasses}>
              <span className={clsx(collapsed && "sr-only")}>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
