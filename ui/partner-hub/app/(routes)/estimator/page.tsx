import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const wizardSteps = [
  {
    title: "Upload",
    detail: "Bring in account lists, CRM exports, or CSV drops in seconds.",
  },
  {
    title: "Map Fields",
    detail: "Align source columns to standard account attributes and owners.",
  },
  {
    title: "Match",
    detail: "Review suggested matches, resolve exceptions, and confirm coverage.",
  },
  {
    title: "Export",
    detail: "Download the mapped list or send clean matches back to your tools.",
  },
];

export default function EstimatorPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Account Mapping</h1>
        <p className="text-sm text-foreground/70">
          Normalize, match, and export account data so partner teams stay aligned.
        </p>
      </header>

      <Card className="space-y-6">
        <CardHeader className="gap-3">
          <CardTitle className="text-xl">Account Mapping workspace</CardTitle>
          <p className="text-sm text-foreground/70">
            Launch a new mapping run to consolidate account lists, validate overlaps, and
            deliver a clean handoff to sales operations.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button>Start new mapping</Button>
            <Button variant="secondary">Demo dataset</Button>
          </div>
          <p className="text-xs text-foreground/60">
            Privacy note: Processing stays client-side so account data never leaves your
            browser.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">4-step wizard</h2>
          <span className="text-xs uppercase tracking-wide text-foreground/50">
            workflow scaffold
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {wizardSteps.map((step, index) => (
            <Card key={step.title} className="space-y-3">
              <CardHeader className="gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Step {index + 1}
                </span>
                <CardTitle className="text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-foreground/70">{step.detail}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}
