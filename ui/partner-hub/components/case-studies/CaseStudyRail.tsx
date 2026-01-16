import { Card } from "@/components/ui/card";
import type { CaseStudy } from "@/data/case-studies";
import { CopyLinkButton } from "@/components/case-studies/CopyLinkButton";

const sectionTitleStyles =
  "text-xs font-semibold uppercase tracking-wide text-foreground/60";

const downloadLinks = [
  {
    label: "Download executive summary (PDF)",
    href: "#/downloads/executive-summary",
  },
  {
    label: "Download architecture brief (PDF)",
    href: "#/downloads/architecture-brief",
  },
];

type CaseStudyRailProps = {
  caseStudy: CaseStudy;
};

export function CaseStudyRail({ caseStudy }: CaseStudyRailProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <Card className="space-y-3 border-border/70 p-4">
        <h2 className={sectionTitleStyles}>Share</h2>
        <CopyLinkButton />
      </Card>

      <Card className="space-y-3 border-border/70 p-4">
        <h2 className={sectionTitleStyles}>Quick Facts</h2>
        <dl className="space-y-3 text-sm text-foreground/70">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Industry
            </dt>
            <dd>{caseStudy.industry}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Workloads
            </dt>
            <dd>
              <ul className="mt-1 space-y-1">
                {caseStudy.workloads.map((workload) => (
                  <li key={workload}>{workload}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Tags
            </dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {caseStudy.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/60"
                >
                  {tag}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-3 border-border/70 p-4">
        <h2 className={sectionTitleStyles}>Outcomes</h2>
        <ul className="space-y-2 text-sm text-foreground/70">
          {caseStudy.outcomes.map((outcome) => (
            <li key={outcome} className="flex items-start gap-3">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/70"
                aria-hidden
              />
              <span>{outcome}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3 border-border/70 p-4">
        <h2 className={sectionTitleStyles}>Stack</h2>
        <div className="space-y-3 text-sm text-foreground/70">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Before
            </p>
            <p>{caseStudy.stack.before}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
              After
            </p>
            <p>{caseStudy.stack.after}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 border-border/70 p-4">
        <h2 className={sectionTitleStyles}>Downloads</h2>
        <ul className="space-y-2 text-sm">
          {downloadLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="font-semibold text-primary hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3 border-border/70 p-4">
        <h2 className={sectionTitleStyles}>Sources</h2>
        <ul className="space-y-2 text-sm">
          {caseStudy.citations.map((citation) => (
            <li key={citation.href}>
              <a
                href={citation.href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                {citation.label}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </aside>
  );
}
