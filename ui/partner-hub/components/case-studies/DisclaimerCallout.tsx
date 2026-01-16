import { Card } from "@/components/ui/card";

export function DisclaimerCallout() {
  return (
    <Card className="border-border/70 bg-muted/30 p-4 text-xs text-foreground/70">
      <div className="space-y-1">
        <p>Anonymized scenario; results vary.</p>
        <p>Referenced outcomes are cited.</p>
        <p>No customer endorsement is implied.</p>
      </div>
    </Card>
  );
}
