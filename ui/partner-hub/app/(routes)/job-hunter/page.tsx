import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Jobs",
    description: "Track saved roles and opportunities in one place.",
    href: "/job-hunter/jobs",
  },
  {
    title: "Applications",
    description: "Review application progress and next steps.",
    href: "/job-hunter/applications",
  },
  {
    title: "Settings",
    description: "Manage source boards for job syncing.",
    href: "/job-hunter/settings",
  },
  {
    title: "Resume",
    description: "Edit resume profile data used for tailoring output.",
    href: "/job-hunter/resume",
  },
];

export default function JobHunterPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Job Hunter</h1>
        <p className="text-sm text-foreground/70">Manage saved jobs and applications.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
