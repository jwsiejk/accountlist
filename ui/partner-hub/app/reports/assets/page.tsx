import { Embed } from "@/components/embed";

export default function AssetReportPage() {
  return (
    <main className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Asset Report</h1>
        <p className="text-sm text-foreground/70">
          Explore available Trace3 × Pure collateral. Request access if you don&apos;t see your assets.
        </p>
      </div>
      <Embed src="/alliances/assets" title="Asset Report" restricted />
    </main>
  );
}
