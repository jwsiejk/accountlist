import { OutreachDashboard } from "@/components/outreach/OutreachDashboard";

export const dynamic = "force-dynamic";

export default function OutreachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Outreach</h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground/60">
          Email campaigns sent from your DDN mailbox, with open, click and reply tracking.
        </p>
      </div>

      <OutreachDashboard />
    </div>
  );
}
