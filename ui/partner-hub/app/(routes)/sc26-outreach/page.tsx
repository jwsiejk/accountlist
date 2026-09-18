import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SC26OutreachDashboard } from "@/components/sc26-outreach/SC26OutreachDashboard";

export const dynamic = "force-dynamic";

export default function SC26OutreachPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">SC26 Outreach</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Import prospects, send the Supercomputing 2026 invite from a connected DDN mailbox, and track
          opens, booking-link clicks, and replies.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prospects</CardTitle>
        </CardHeader>
        <CardContent>
          <SC26OutreachDashboard />
        </CardContent>
      </Card>
    </div>
  );
}
