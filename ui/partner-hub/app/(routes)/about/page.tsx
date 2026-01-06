import Link from "next/link";

export default function AboutPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">About / Contact</h1>
        <p className="text-sm text-foreground/70">
          Portfolio context for presales solution architecture engagements.
        </p>
      </header>
      <div className="rounded-2xl border border-border bg-background p-6 text-sm text-foreground/70 shadow-sm">
        <p>
          Focused on data center modernization, hybrid cloud integrations, and energy-aware infrastructure
          planning. Available for technical discovery sessions, architecture validation, and solution
          roadmap alignment.
        </p>
        <div className="mt-4 space-y-2">
          <p>
            <span className="font-semibold text-foreground">Contact:</span> portfolio@example.com
          </p>
          <p>
            <span className="font-semibold text-foreground">Location:</span> Remote / West Coast
          </p>
          <Link
            href="#"
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
          >
            Download resume
          </Link>
        </div>
      </div>
    </section>
  );
}
