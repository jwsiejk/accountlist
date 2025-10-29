import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import links from "@/data/links.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-white to-secondary/10 p-10 shadow-sm dark:via-slate-900">
        <p className="text-sm font-medium text-primary">Partner Hub</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Empower every Trace3 × Pure alliance engagement
        </h1>
        <p className="mt-4 max-w-2xl text-base text-foreground/70">
          Stay aligned across sales, marketing, engineering, and leadership with quick access to
          the resources you need—even when you are offline.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <span className="text-xs uppercase tracking-wide text-foreground/50">
            {links.length} curated shortcuts
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{item.title}</span>
                  <ArrowUpRight className="h-4 w-4 text-foreground/40" aria-hidden />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <span className="text-foreground/60">
                  {item.type === "external" ? "External resource" : "Internal link"}
                </span>
                <Link
                  href={item.href}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
                >
                  Open
                </Link>
              </CardContent>
              {item.restricted ? (
                <div className="px-6 pb-4 text-xs font-medium text-foreground/50">
                  Restricted • Request Pure portal access
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
