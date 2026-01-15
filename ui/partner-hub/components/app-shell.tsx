import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { LeftNav } from "./left-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(239,74,0,0.08),_transparent_50%),radial-gradient(circle_at_top_right,_rgba(0,174,239,0.08),_transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,_rgba(15,23,42,0.04),_transparent_40%)]" />
      <AppHeader />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-6 py-10 lg:px-10">
        <LeftNav />
        <main className="flex-1 space-y-10 md:space-y-14">{children}</main>
      </div>
    </div>
  );
}
