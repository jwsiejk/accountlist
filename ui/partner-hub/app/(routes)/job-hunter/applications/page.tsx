"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  applicationReducer,
  buildAnswerPack,
  buildFollowUpEmail,
  createApplicationFromJob,
  exportApplicationsCsv,
  resolveApplicationJobDetails,
} from "@/lib/job-hunter/applications";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";
import type { ApplicationStatus, JobPosting } from "@/lib/job-hunter/types";

const copyText = async (value: string) => {
  await navigator.clipboard.writeText(value);
};

export default function JobHunterApplicationsPage() {
  const initialStore = loadJobHunterStore();
  const [jobsById] = useState<Record<string, JobPosting>>(initialStore.jobsById ?? {});
  const [applicationsById, setApplicationsById] = useState(() => {
    const seeded = { ...(initialStore.applicationsById ?? {}) };
    const now = new Date().toISOString();

    Object.values(jobsById).forEach((job) => {
      if (!seeded[job.id]) {
        seeded[job.id] = createApplicationFromJob(job, now);
      }
    });

    return seeded;
  });
  const [message, setMessage] = useState<string | null>(null);

  const applications = useMemo(() => Object.values(applicationsById), [applicationsById]);

  const save = (next: Record<string, typeof applications[number]>) => {
    setApplicationsById(next);
    saveJobHunterStore({
      ...loadJobHunterStore(),
      jobs: Object.values(jobsById),
      jobsById,
      applicationsById: next,
      applications: Object.values(next),
    });
  };

  const setStatus = (jobId: string, status: ApplicationStatus) => {
    const job = jobsById[jobId];
    let next = applicationReducer(applicationsById, { type: "setStatus", jobId, status });
    if (status === "applied" && job) {
      next = applicationReducer(next, { type: "ensureSnapshotFromJob", jobId, job });
    }
    save(next);
  };

  const setReminder = (jobId: string, reminderAt?: string) => {
    save(applicationReducer(applicationsById, { type: "setReminder", jobId, reminderAt }));
  };

  const exportCsv = () => {
    const csv = exportApplicationsCsv(applications, jobsById);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "job-hunter-applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="text-sm text-foreground/70">Track statuses, reminders, and follow-ups across your pipeline.</p>
      </header>

      <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
        <p className="text-sm text-foreground/70">{applications.length} tracked application(s)</p>
        <Button onClick={exportCsv} size="sm" type="button" variant="secondary">Download CSV</Button>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <section className="grid gap-4 lg:grid-cols-5">
        {APPLICATION_STATUSES.map((status) => {
          const items = applications
            .filter((application) => application.status === status)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

          return (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3" key={status}>
              <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
              {items.map((application) => {
                const job = jobsById[application.jobId];
                const jobDetails = resolveApplicationJobDetails(application, jobsById);

                return (
                  <article className="space-y-2 rounded-md border border-border/60 bg-background p-3" key={application.id}>
                    <p className="text-sm font-medium">{jobDetails.title}</p>
                    <p className="text-xs text-foreground/70">{jobDetails.company}</p>
                    {jobDetails.missingLiveJob ? (
                      <p className="text-xs text-amber-700">Posting no longer in current sync. Showing stored application snapshot.</p>
                    ) : (
                      <Link className="text-xs text-blue-600 hover:underline" href={`/job-hunter/jobs/${encodeURIComponent(application.jobId)}`}>
                        Open Job Workspace
                      </Link>
                    )}
                    {application.notes ? <p className="rounded bg-muted/40 p-2 text-xs">Notes: {application.notes}</p> : null}

                    <div className="flex flex-wrap gap-2">
                      {jobDetails.sourceUrl ? (
                        <a className="text-xs text-blue-600 hover:underline" href={jobDetails.sourceUrl} rel="noreferrer" target="_blank">
                          Open application link
                        </a>
                      ) : null}
                      {job ? (
                        <>
                          <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={async () => {
                              await copyText(buildAnswerPack(job));
                              setMessage(`Copied answer pack for ${job.company}.`);
                            }}
                            type="button"
                          >
                            Pre-fill answer pack
                          </button>
                          <button
                            className="text-xs text-blue-600 hover:underline"
                            onClick={async () => {
                              await copyText(buildFollowUpEmail(job));
                              setMessage(`Copied follow-up email for ${job.company}.`);
                            }}
                            type="button"
                          >
                            Copy follow-up email
                          </button>
                        </>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setStatus(application.jobId, "applied")} size="sm" type="button" variant="ghost">Mark applied</Button>
                      <Button onClick={() => setStatus(application.jobId, "interview")} size="sm" type="button" variant="ghost">Interview</Button>
                      <Button onClick={() => setStatus(application.jobId, "offer")} size="sm" type="button" variant="ghost">Offer</Button>
                      <Button onClick={() => setStatus(application.jobId, "rejected")} size="sm" type="button" variant="ghost">Reject</Button>
                    </div>

                    <label className="block text-xs text-foreground/70">
                      Reminder
                      <input
                        className="mt-1 w-full rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
                        onChange={(event) => {
                          const value = event.target.value;
                          setReminder(application.jobId, value ? new Date(value).toISOString() : undefined);
                        }}
                        type="date"
                        value={application.reminderAt ? application.reminderAt.slice(0, 10) : ""}
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          );
        })}
      </section>
    </main>
  );
}
