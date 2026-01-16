import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { caseStudies } from "@/data/case-studies";

type CaseStudyPageProps = {
  params: {
    slug: string;
  };
};

export default function CaseStudyPage({ params }: CaseStudyPageProps) {
  const caseStudy = caseStudies.find((study) => study.slug === params.slug);

  if (!caseStudy) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/case-studies"
          className="text-xs font-semibold uppercase tracking-wide text-primary transition hover:text-primary/80"
        >
          ← Back to case studies
        </Link>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {caseStudy.title}
          </h1>
          <p className="text-base text-foreground/70">{caseStudy.heroSummary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {caseStudy.industry}
          </span>
          {caseStudy.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/60"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              Workloads
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/70">
            <ul className="list-disc space-y-1 pl-5">
              {caseStudy.workloads.map((workload) => (
                <li key={workload}>{workload}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              Stack shift
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/70">
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
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/70">
            <ul className="space-y-2">
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {caseStudy.sections.map((section) => (
          <Card key={section.id} className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/70">
              {section.body ? <p>{section.body}</p> : null}
              {section.bullets ? (
                <ul className="list-disc space-y-1 pl-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {section.callouts ? (
                <div className="space-y-2">
                  {section.callouts.map((callout) => (
                    <div
                      key={callout}
                      className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary/80"
                    >
                      {callout}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {caseStudy.citations.length ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
              Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground/70">
            <ul className="space-y-2">
              {caseStudy.citations.map((citation) => (
                <li key={citation.href}>
                  <a
                    href={citation.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {citation.label}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
