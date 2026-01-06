import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const estimateSteps = [
  {
    title: "Capture workload inputs",
    detail: "Collect capacity, performance, and resiliency requirements.",
  },
  {
    title: "Map to platform tiers",
    detail: "Align workloads to the right storage and data services mix.",
  },
  {
    title: "Review cost bands",
    detail: "Generate budgetary ranges with assumptions clearly documented.",
  },
];

export default function EstimatorPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Estimator</h1>
        <p className="text-sm text-foreground/70">
          Build a rapid sizing model for data center infrastructure proposals.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {estimateSteps.map((step) => (
          <Card key={step.title}>
            <CardHeader>
              <CardTitle className="text-base">{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground/70">{step.detail}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
