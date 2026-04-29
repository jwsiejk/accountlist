import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Conversations",
    description: "Start here to draft outreach, manage manual follow-ups, and track replies through interview outcomes.",
    href: "/job-hunter/conversations",
  },
  {
    title: "Find Jobs",
    description: "Find and score opportunities based on your target roles and company criteria.",
    href: "/job-hunter/jobs",
  },
  {
    title: "Preferences",
    description: "Define target roles, locations, and companies that shape conversation pipeline quality.",
    href: "/job-hunter/preferences",
  },
  {
    title: "Applications",
    description: "Use guided apply tracking as supporting context for ongoing hiring conversations.",
    href: "/job-hunter/applications",
  },
  {
    title: "Resume",
    description: "Maintain resume profile inputs that support targeted outreach and tailored application assets.",
    href: "/job-hunter/resume",
  },
  {
    title: "Advanced Sources",
    description: "Optional supporting workflow for manual provider/token configuration and source control.",
    href: "/job-hunter/settings",
  },
];

export default function JobHunterPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Conversation Pipeline</h1>
        <p className="text-sm text-foreground/70">Generate targeted outreach, manage follow-ups, and turn job opportunities into hiring conversations.</p>
      </header>

      <section className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
        <ol className="list-decimal space-y-1 pl-5 text-foreground/80">
          <li>Set target roles and companies</li>
          <li>Find and score opportunities</li>
          <li>Generate conversation drafts</li>
          <li>Send and track follow-ups manually</li>
          <li>Measure replies, conversations, and interviews</li>
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
