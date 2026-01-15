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
            <span className="font-semibold text-foreground">Contact:</span>{" "}
            <Link href="mailto:jwsiejk@gmail.com" className="text-primary hover:underline">
              jwsiejk@gmail.com
            </Link>
          </p>
          <p>
            <span className="font-semibold text-foreground">Location:</span> Boyertown, PA
          </p>
          <p>
            <span className="font-semibold text-foreground">LinkedIn:</span>{" "}
            <Link
              href="https://www.linkedin.com/in/james-siejk-b93a2481/"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              View profile
            </Link>
          </p>
          <Link
            href="/resume/James_Siejk_Resume.pdf"
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
          >
            Download resume
          </Link>
        </div>
      </div>
    </section>
  );
}
