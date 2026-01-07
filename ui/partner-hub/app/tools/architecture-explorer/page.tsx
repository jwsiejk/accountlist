import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ArchitectureExplorer = dynamic(() => import("./ArchitectureExplorer"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-h-[420px]">
        <CardHeader className="pb-2">Architecture Map</CardHeader>
        <CardContent>
          <div className="h-[380px] animate-pulse rounded-lg border border-dashed border-border/70 bg-muted" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">Node Details</CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  ),
});

export default function ArchitectureExplorerPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Architecture Explorer</h1>
        <p className="text-sm text-foreground/70">
          Compare reference architectures and capture impacts for presales discovery.
        </p>
      </header>
      <ArchitectureExplorer />
    </section>
  );
}
