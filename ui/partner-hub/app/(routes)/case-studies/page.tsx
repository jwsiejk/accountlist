import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const caseStudies = [
  {
    title: "Tier-3 Colocation Modernization",
    summary: "Consolidated legacy storage estates into a unified, resilient fabric with faster provisioning.",
    href: "#",
  },
  {
    title: "Healthcare Data Center Refresh",
    summary: "Improved clinical application uptime while cutting backup windows by 40%.",
    href: "#",
  },
  {
    title: "Global SaaS Expansion",
    summary: "Scaled multi-region capacity planning with predictable performance guardrails.",
    href: "#",
  },
];

export default function CaseStudiesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Case Studies</h1>
        <p className="text-sm text-foreground/70">
          Proof points and outcomes from recent data center infrastructure engagements.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {caseStudies.map((study) => (
          <Card key={study.title}>
            <CardHeader>
              <CardTitle className="text-base">{study.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/70">
              <p>{study.summary}</p>
              <Link
                href={study.href}
                className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
              >
                View summary
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
