"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Search } from "lucide-react";
import { Button } from "./ui/button";

export function AppHeader() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-6">
        <div className="text-lg font-semibold tracking-tight text-primary">
          Trace3 × Pure Partner Hub
        </div>
        <div className="relative mx-auto flex w-full max-w-xl items-center">
          <Search className="absolute left-3 h-4 w-4 text-foreground/40" aria-hidden />
          <input
            className="h-10 w-full rounded-lg border border-border bg-white/60 pl-9 pr-3 text-sm shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 dark:bg-slate-950/40"
            placeholder="Search partner resources"
            type="search"
            aria-label="Search"
          />
        </div>
        <Button
          variant="ghost"
          className="h-10 w-10 rounded-full border border-transparent hover:border-border"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
