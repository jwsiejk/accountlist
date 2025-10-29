"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

const links = [
  { name: "Home", href: "/" },
  { name: "Sales", href: "/sales" },
  { name: "Marketing", href: "/marketing" },
  { name: "Engineering (SE)", href: "/engineering" },
  { name: "Alliances", href: "/alliances" },
  { name: "Leadership", href: "/leadership" },
  { name: "Tools", href: "#tools" },
  { name: "Training", href: "#training" },
  { name: "Events", href: "#events" },
  { name: "Support", href: "#support" },
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
          const active = link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-muted",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70",
                collapsed && "justify-center px-0",
              )}
            >
              <span className={clsx(collapsed && "sr-only")}>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
