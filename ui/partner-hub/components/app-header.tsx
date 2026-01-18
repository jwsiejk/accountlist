"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, Search, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
import { useOmniSearch, type OmniLink } from "@/lib/use-omni-search";

export function AppHeader() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { query, setQuery, results } = useOmniSearch();
  const [open, setOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navigateTo = (link: OmniLink) => {
    if (link.type === "external") {
      window.open(link.href, "_blank", "noopener");
    } else {
      router.push(link.href);
    }
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6 lg:px-10">
        <Link
          href="/"
          aria-label="Portfolio Hub Home"
          className="flex items-center rounded-md px-2 py-1 transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="text-sm font-semibold text-foreground">Portfolio Hub</span>
        </Link>
        <div className="relative mx-auto flex w-full max-w-xl items-center">
          <Search className="absolute left-3 h-4 w-4 text-foreground/40" aria-hidden />
          <input
            className="h-10 w-full rounded-lg border border-border/70 bg-background/80 pl-9 pr-3 text-sm text-foreground shadow-inner outline-none transition focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Search portfolio resources"
            type="search"
            aria-label="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                event.preventDefault();
                navigateTo(results[0]);
              }
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 100);
            }}
          />
          {open && results.length > 0 ? (
            <ul
              role="listbox"
              className="absolute left-0 right-0 top-11 z-10 max-h-80 overflow-y-auto rounded-lg border border-border bg-background shadow-lg"
            >
              {results.map((item) => (
                <li key={`${item.role}-${item.href}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => navigateTo(item)}
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-xs uppercase tracking-wide text-foreground/50">
                        {item.role} • {item.type === "external" ? "External" : "Internal"}
                        {item.restricted ? " • Restricted" : ""}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-foreground/40" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          variant="ghost"
          className="h-10 w-10 rounded-full border border-transparent hover:border-border"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
