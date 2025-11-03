import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { LeftNav } from "./left-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-8">
        <LeftNav />
        <main className="flex-1 space-y-6">{children}</main>
      </div>
    </div>
  );
}
