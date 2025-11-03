import { Embed } from "@/components/embed";

export default function EnergyAppPage() {
  return (
    <main className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Energy App</h1>
        <p className="text-sm text-foreground/70">
          Access the integrated Energy experience without leaving the Partner Hub.
        </p>
      </div>
      <Embed src="/energy" title="Energy App" />
    </main>
  );
}
