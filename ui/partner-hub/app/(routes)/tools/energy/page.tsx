import { Embed } from "@/components/embed";

export default function EnergyToolPage() {
  return (
    <main className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Energy Tool</h1>
        <p className="text-sm text-foreground/70">
          Model data center energy consumption and efficiency scenarios alongside the portfolio.
        </p>
      </div>
      <Embed src="/energy/" title="Energy Tool" bypassBasePath openInNewTab />
    </main>
  );
}
