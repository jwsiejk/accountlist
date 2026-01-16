import { Card } from "@/components/ui/card";

type CalloutCardProps = {
  title: string;
  description: string;
  accent?: string;
};

export function CalloutCard({
  title,
  description,
  accent = "from-primary/15 via-primary/5 to-transparent",
}: CalloutCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-background/80 p-4">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`}
        aria-hidden
      />
      <div className="relative space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
          {title}
        </p>
        <p className="text-sm font-medium text-foreground/80">{description}</p>
      </div>
    </Card>
  );
}
