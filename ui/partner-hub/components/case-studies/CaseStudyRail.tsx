import { Card } from "@/components/ui/card";
import type { CaseStudy } from "@/data/case-studies";
import { CopyLinkButton } from "@/components/case-studies/CopyLinkButton";
import { Button } from "@/components/ui/button";
import { getSourceDomain } from "@/lib/case-study-sources";

const sectionTitleStyles =
  "text-xs font-semibold uppercase tracking-wide text-foreground/60";

const outcomeBadgeStyles = {
  target: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  referenced: "border-sky-500/30 bg-sky-500/10 text-sky-600",
  observed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
} as const;

const outcomeLabelText = {
  target: "Target",
  referenced: "Referenced",
  observed: "Observed",
} as const;

type CaseStudyRailProps = {
  caseStudy: CaseStudy;
};

export function CaseStudyRail({ caseStudy }: CaseStudyRailProps) {
  const sources = caseStudy.sources.map((source, index) => ({
    ...source,
    index: index + 1,
    domain: getSourceDomain(source.url),
  }));
  const vendorSources = sources.filter((source) => source.category === "vendor");
  const thirdPartySources = sources.filter(
    (source) => source.category === "third-party"
  );

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <Card className="space-y-3 border-border/70 p-4 motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm motion-reduce:transition-none">
        <h2 className={sectionTitleStyles}>Share</h2>
        <CopyLinkButton />
      </Card>

      <Card className="space-y-3 border-border/70 p-4 motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm motion-reduce:transition-none">
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

      <Card className="space-y-3 border-border/70 p-4 motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm motion-reduce:transition-none">
        <h2 className={sectionTitleStyles}>Outcomes</h2>
        <ul className="space-y-2 text-sm text-foreground/70">
          {caseStudy.outcomes.map((outcome) => (
            <li key={outcome.text} className="flex items-start gap-3">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/70"
                aria-hidden
              />
              <div className="space-y-1">
                <span
                  className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${outcomeBadgeStyles[outcome.labelType]}`}
                >
                  {outcomeLabelText[outcome.labelType]}
                </span>
                <p>{outcome.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-foreground/50">
          Legend: Target = planned goal, Referenced = vendor/third-party claim,
          Observed = measured deployment result.
        </p>
      </Card>

      <Card className="space-y-3 border-border/70 p-4 motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm motion-reduce:transition-none">
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

      <Card className="space-y-3 border-border/70 p-4 motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm motion-reduce:transition-none">
        <h2 className={sectionTitleStyles}>Downloads</h2>
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled
            aria-disabled="true"
            title="Coming soon"
          >
            Download PDF
          </Button>
          <p className="text-xs text-foreground/50">Coming soon</p>
        </div>
      </Card>

      <Card className="space-y-3 border-border/70 p-4 motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm motion-reduce:transition-none">
        <h2 className={sectionTitleStyles}>Sources</h2>
        <div className="space-y-3 text-xs text-foreground/70">
          <p>
            Inline references are numbered.{" "}
            <a
              href="#citations-appendix"
              className="font-semibold text-primary hover:underline"
            >
              View appendix
            </a>
            .
          </p>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                Vendor references
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {vendorSources.length ? (
                  vendorSources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] font-semibold text-foreground/80 transition hover:underline"
                    >
                      <span className="text-foreground/50">[{source.index}]</span>
                      <span className="break-words">{source.title}</span>
                      <span className="text-foreground/50">({source.domain})</span>
                    </a>
                  ))
                ) : (
                  <span className="text-foreground/50">None listed.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                Third-party references
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {thirdPartySources.length ? (
                  thirdPartySources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] font-semibold text-foreground/80 transition hover:underline"
                    >
                      <span className="text-foreground/50">[{source.index}]</span>
                      <span className="break-words">{source.title}</span>
                      <span className="text-foreground/50">({source.domain})</span>
                    </a>
                  ))
                ) : (
                  <span className="text-foreground/50">None listed.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </aside>
  );
}
