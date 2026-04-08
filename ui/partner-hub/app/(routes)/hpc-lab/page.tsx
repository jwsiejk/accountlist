import { HpcLabTool } from "@/components/hpc-lab/hpc-lab-tool";

const hpcLabEnabled = process.env.NEXT_PUBLIC_ENABLE_HPC_LAB === "true";

export default function HpcLabPage() {
  if (!hpcLabEnabled) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
        <div className="max-w-lg rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">HPC Lab</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">HPC Lab is disabled</h1>
          <p className="mt-3 text-sm text-foreground/60">
            Set the <span className="font-semibold">NEXT_PUBLIC_ENABLE_HPC_LAB</span> flag to &quot;true&quot; to enable this
            tool.
          </p>
        </div>
      </div>
    );
  }

  return <HpcLabTool />;
}
