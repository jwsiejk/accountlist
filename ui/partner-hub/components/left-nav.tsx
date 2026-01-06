"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

const links = [
  { name: "Home", href: "/" },
  { name: "Case Studies", href: "/case-studies" },
  { name: "Architecture Explorer", href: "/architecture-explorer" },
  { name: "Estimator", href: "/estimator" },
  { name: "Energy Tool", href: "/energy/", external: true },
  { name: "About / Contact", href: "/about" },
];

export function LeftNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "flex h-full flex-col border-r border-border bg-white/70 backdrop-blur transition-all dark:bg-slate-900/70",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <button
        className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-foreground/60"
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
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted",
            active ? "bg-primary/10 text-primary" : "text-foreground/70",
            collapsed && "justify-center px-0",
          );

          if (link.external) {
            return (
              <a key={link.name} href={link.href} className={baseClasses}>
                <span className={clsx(collapsed && "sr-only")}>{link.name}</span>
              </a>
            );
          }

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
