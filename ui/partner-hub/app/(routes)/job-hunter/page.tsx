import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Find Jobs",
    description: "Run discovery from your preferences and review top matches.",
    href: "/job-hunter/jobs",
  },
  {
    title: "Preferences",
    description: "Set targeting rules that drive discovery and ranking.",
    href: "/job-hunter/preferences",
  },
  {
    title: "Applications",
    description: "Review application progress and next steps.",
    href: "/job-hunter/applications",
  },
  {
    title: "Conversations",
    description: "Review outreach drafts, follow-ups, replies, and missing targets.",
    href: "/job-hunter/conversations",
  },
  {
    title: "Resume",
    description: "Edit resume profile data used for minimal-delta tailoring output.",
    href: "/job-hunter/resume",
  },
  {
    title: "Advanced Sources",
    description: "Optional manual provider/token setup for power users.",
    href: "/job-hunter/settings",
  },
];

export default function JobHunterPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Job Hunter</h1>
        <p className="text-sm text-foreground/70">Use preferences-first discovery to find jobs, then choose, tailor, and apply.</p>
      </header>

      <section className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
        <ol className="list-decimal space-y-1 pl-5 text-foreground/80">
          <li>Set preferences</li>
          <li>Find jobs from preferences</li>
          <li>Select jobs to pursue</li>
          <li>Tailor resume variants minimally</li>
          <li>Complete guided apply workflow</li>
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full hover:border-primary/40 hover:bg-muted/30">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>{section.description}</CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
