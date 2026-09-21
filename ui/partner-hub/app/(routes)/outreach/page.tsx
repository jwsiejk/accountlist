import { OutreachDashboard } from "@/components/outreach/OutreachDashboard";

export const dynamic = "force-dynamic";

export default function OutreachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Outreach</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Run multiple email outreach campaigns, each with its own prospect list and templates, from
          a connected DDN mailbox with full open/click/reply tracking.
        </p>
      </div>

      <OutreachDashboard />
    </div>
  );
}
