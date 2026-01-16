import Link from "next/link";
import type { CaseStudy } from "@/data/case-studies";

const badgeStyles =
  "inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/60";

const industryBadgeStyles =
  "inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary";

type CaseStudyHeroProps = {
  caseStudy: CaseStudy;
};

export function CaseStudyHero({ caseStudy }: CaseStudyHeroProps) {
  return (
    <section className="space-y-6">
      <Link
        href="/case-studies"
        className="text-xs font-semibold uppercase tracking-wide text-primary transition hover:text-primary/80"
      >
        ← Back to case studies
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={industryBadgeStyles}>{caseStudy.industry}</span>
            {caseStudy.tags.map((tag) => (
              <span key={tag} className={badgeStyles}>
                {tag}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {caseStudy.title}
            </h1>
            <p className="text-base text-foreground/70">
              {caseStudy.heroSummary}
            </p>
            <p className="rounded-md border border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold text-foreground/80">
              <span className="text-foreground/50">Transformation:</span>{" "}
              <span>{caseStudy.stack.before}</span>
              <span className="mx-2 text-foreground/40">→</span>
              <span>{caseStudy.stack.after}</span>
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/20 via-background to-muted/60 p-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              Visual tile
            </p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <svg
                viewBox="0 0 180 120"
                role="img"
                aria-label="Case study architecture visual"
                className="h-24 w-full"
              >
                <defs>
                  <linearGradient id="heroGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="180" height="120" rx="16" fill="#0f172a" />
                <rect
                  x="12"
                  y="18"
                  width="64"
                  height="32"
                  rx="10"
                  fill="url(#heroGradient)"
                />
                <rect
                  x="92"
                  y="18"
                  width="76"
                  height="32"
                  rx="10"
                  fill="#1e293b"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <rect
                  x="12"
                  y="64"
                  width="76"
                  height="36"
                  rx="10"
                  fill="#1e293b"
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                />
                <rect
                  x="98"
                  y="64"
                  width="70"
                  height="36"
                  rx="10"
                  fill="url(#heroGradient)"
                  opacity="0.7"
                />
                <path
                  d="M46 50 L46 64"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <path
                  d="M130 50 L130 64"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <path
                  d="M76 34 L92 34"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <p className="text-xs text-foreground/60">
              Secure, tiered storage with cyber recovery lanes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
