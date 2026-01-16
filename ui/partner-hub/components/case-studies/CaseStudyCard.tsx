import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CaseStudy } from "@/data/case-studies";

type CaseStudyCardProps = {
  caseStudy: CaseStudy;
};

const outcomeLimit = 3;

export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  const href = `/case-studies/${caseStudy.slug}`;

  return (
    <Card className="border-border/70 motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-reduce:transition-none">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {caseStudy.industry}
          </span>
          {caseStudy.workloads.map((workload) => (
            <span
              key={workload}
              className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/60"
            >
              {workload}
            </span>
          ))}
        </div>
        <CardTitle className="text-base">{caseStudy.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-foreground/70">
        <p>{caseStudy.heroSummary}</p>
        <ul className="space-y-2">
          {caseStudy.outcomes.slice(0, outcomeLimit).map((outcome) => (
            <li key={outcome.text} className="flex items-start gap-3">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/70"
                aria-hidden
              />
              <span>{outcome.text}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
          <span className="text-foreground/50">Before</span>
          <span className="mx-2 text-foreground/40">→</span>
          <span className="text-foreground/80">After</span>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-medium normal-case text-foreground/70">
            <span>{caseStudy.stack.before}</span>
            <span className="text-foreground/40">→</span>
            <span>{caseStudy.stack.after}</span>
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm motion-reduce:transition-none"
        >
          Read case study
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
