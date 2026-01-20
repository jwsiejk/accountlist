import Link from "next/link";
import { Mail, MapPin, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <section className="space-y-8 md:space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">About / Contact</h1>
        <p className="max-w-2xl text-base text-foreground/70">
          Portfolio context for solution architecture engagements.
        </p>
      </header>
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Engagement focus</CardTitle>
          <p className="max-w-2xl text-sm text-foreground/70">
            Focused on data center modernization, hybrid cloud integrations, and energy-aware infrastructure
            planning. Available for technical discovery sessions, architecture validation, and solution
            roadmap alignment.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-foreground/70">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
              <Mail className="h-4 w-4 text-primary" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  Contact
                </p>
                <Link href="mailto:jwsiejk@gmail.com" className="text-sm font-semibold text-foreground">
                  jwsiejk@gmail.com
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  Location
                </p>
                <p className="text-sm font-semibold text-foreground">Boyertown, PA</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="https://www.linkedin.com/in/james-siejk-b93a2481/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-muted/40"
            >
              View LinkedIn
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/resume/James_Siejk_Resume.pdf"
              className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-muted/40"
            >
              Download resume
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
