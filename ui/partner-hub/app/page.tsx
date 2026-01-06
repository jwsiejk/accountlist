import Link from "next/link";
import { ArrowUpRight, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const featureCards = [
  {
    title: "Architecture Explorer",
    description: "Navigate reference architectures and validated design patterns.",
    href: "/architecture-explorer",
  },
  {
    title: "Estimator",
    description: "Size infrastructure footprints and budgetary ranges quickly.",
    href: "/estimator",
  },
  {
    title: "Energy Tool",
    description: "Model power and cooling impact for data center refreshes.",
    href: "/energy/",
    external: true,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-10 shadow-sm dark:via-slate-900">
        <p className="text-sm font-medium text-primary">Portfolio Hub</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Presales Solutions Architect Portfolio
        </h1>
        <p className="mt-4 max-w-2xl text-base text-foreground/70">
          A modern hub for data center infrastructure engagements, pairing architecture insights
          with the right tools and evidence to move deals forward.
        </p>
        <ul className="mt-6 grid gap-3 text-sm text-foreground/70 sm:grid-cols-3">
          <li className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
            12+ validated reference designs across AI, hybrid cloud, and edge.
          </li>
          <li className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
            Rapid sizing and budget ranges in minutes with built-in estimators.
          </li>
          <li className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
            Energy impact modeling to support sustainability narratives.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="#"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download resume
          </Link>
          <span className="text-xs text-foreground/60">Placeholder link for future resume file.</span>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Featured Apps</h2>
          <span className="text-xs uppercase tracking-wide text-foreground/50">3 core tools</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <Card key={card.title}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{card.title}</span>
                  <ArrowUpRight className="h-4 w-4 text-foreground/40" aria-hidden />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-foreground/70">
                <p>{card.description}</p>
                {card.external ? (
                  <a
                    href={card.href}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                  >
                    Open app
                  </a>
                ) : (
                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                  >
                    Open app
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
