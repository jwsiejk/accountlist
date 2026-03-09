"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/job-hunter/EmptyState";
import { JobList } from "@/components/job-hunter/JobList";
import { Button } from "@/components/ui/button";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";
import type { JobPosting } from "@/lib/job-hunter/types";

export default function JobHunterJobsPage() {
  const initialStore = loadJobHunterStore();
  const [jobsById, setJobsById] = useState<Record<string, JobPosting>>(initialStore.jobsById ?? {});
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(initialStore.lastSyncedAt);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minDate, setMinDate] = useState("");

  const jobs = useMemo(() => Object.values(jobsById), [jobsById]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesQuery =
        query.length === 0 ||
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query);
      const matchesRemote = !remoteOnly || job.isRemote === true;
      const jobDate = (job.postedAt ?? job.updatedAt).slice(0, 10);
      const matchesDate = !minDate || jobDate >= minDate;

      return matchesQuery && matchesRemote && matchesDate;
    });
  }, [jobs, minDate, remoteOnly, search]);

  const handleSync = async () => {
    setError(null);
    setIsSyncing(true);

    try {
      const response = await fetch("/api/job-hunter/sync", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        jobsById?: Record<string, JobPosting>;
        lastSyncedAt?: string;
      };

      if (!response.ok || !payload.jobsById) {
        throw new Error(payload.error ?? "Sync failed.");
      }

      setJobsById(payload.jobsById);
      setLastSyncedAt(payload.lastSyncedAt);

      saveJobHunterStore({
        ...loadJobHunterStore(),
        jobs: Object.values(payload.jobsById),
        jobsById: payload.jobsById,
        lastSyncedAt: payload.lastSyncedAt,
      });
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to sync jobs.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <p className="text-sm text-foreground/70">Automatically sync configured Greenhouse/Lever boards each run.</p>
      </header>

      <section className="space-y-2 rounded-lg border border-border/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-foreground/70">Last sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}</p>
          <Button disabled={isSyncing} onClick={handleSync} type="button">
            {isSyncing ? "Syncing..." : "Sync Jobs"}
          </Button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </section>

      <section className="grid gap-3 rounded-lg border border-border/60 p-4 md:grid-cols-3">
        <input
          className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title or company"
          value={search}
        />
        <label className="flex items-center gap-2 text-sm">
          <input checked={remoteOnly} onChange={(event) => setRemoteOnly(event.target.checked)} type="checkbox" />
          Remote only
        </label>
        <input
          className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
          onChange={(event) => setMinDate(event.target.value)}
          type="date"
          value={minDate}
        />
      </section>

      {filteredJobs.length > 0 ? (
        <JobList jobs={filteredJobs} />
      ) : (
        <EmptyState title="No jobs yet" description="Configure sources and click Sync Jobs to pull postings." />
      )}
    </main>
  );
}
