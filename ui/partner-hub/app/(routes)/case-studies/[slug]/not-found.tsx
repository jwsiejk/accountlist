import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CaseStudyNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Card className="w-full max-w-md border-border/70">
        <CardHeader className="space-y-2">
          <CardTitle>Case study not found</CardTitle>
          <p className="text-sm text-foreground/70">
            We couldn&apos;t find that case study. Try another from the registry.
          </p>
        </CardHeader>
        <CardContent>
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/10"
          >
            Back to case studies
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
