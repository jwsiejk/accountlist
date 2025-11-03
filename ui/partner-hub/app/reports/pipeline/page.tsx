import { Embed } from "@/components/embed";

export default function PipelineReportPage() {
  return (
    <main className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Pipeline Report</h1>
        <p className="text-sm text-foreground/70">
          Review the latest Trace3 × Pure opportunities directly from the Partner Hub.
        </p>
      </div>
      <Embed src="/alliances/pipeline" title="Pipeline Report" />
    </main>
  );
}
