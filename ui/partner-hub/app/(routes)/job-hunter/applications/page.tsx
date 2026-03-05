import { EmptyState } from "@/components/job-hunter/EmptyState";

export default function JobHunterApplicationsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="text-sm text-foreground/70">Track your application pipeline.</p>
      </header>

      <EmptyState
        title="No applications tracked yet"
        description="Once jobs are saved and applications are created, this page will show status, timelines, and follow-ups."
      />
    </main>
  );
}
