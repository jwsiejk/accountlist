import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const architectures = [
  {
    title: "Hybrid Cloud Landing Zone",
    detail: "Validated design for hybrid storage tiers and DR readiness.",
  },
  {
    title: "AI/ML Data Pipeline",
    detail: "Reference architecture for GPU clusters with high-throughput storage.",
  },
  {
    title: "Core Data Center Refresh",
    detail: "Modernization blueprint for block and file consolidation.",
  },
];

export default function ArchitectureExplorerPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Architecture Explorer</h1>
        <p className="text-sm text-foreground/70">
          Browse reference architectures and deployment patterns for presales discovery.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {architectures.map((architecture) => (
          <Card key={architecture.title}>
            <CardHeader>
              <CardTitle className="text-base">{architecture.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/70">
              <p>{architecture.detail}</p>
              <Link
                href="#"
                className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
              >
                Open blueprint
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
