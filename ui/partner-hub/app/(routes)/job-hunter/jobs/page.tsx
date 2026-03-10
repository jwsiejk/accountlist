"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/job-hunter/EmptyState";
import { JobList, type JobListRow } from "@/components/job-hunter/JobList";
import { Button } from "@/components/ui/button";
import { getDefaultPreferences, jobMatchesPreferences, normalizePreferences } from "@/lib/job-hunter/preferences";
import { scoreJobFit, summarizeJobReason } from "@/lib/job-hunter/scoring";
import { toggleJobSelection } from "@/lib/job-hunter/queue";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";
import type { JobHunterPreferences, JobPosting } from "@/lib/job-hunter/types";

export default function JobHunterJobsPage() {
  const initialStore = loadJobHunterStore();
  const initialPreferences = normalizePreferences(initialStore.preferences);

  const [jobsById, setJobsById] = useState<Record<string, JobPosting>>(initialStore.jobsById ?? {});
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>(initialStore.selectedJobIds ?? []);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(initialStore.lastSyncedAt);
  const [preferences] = useState<JobHunterPreferences>(initialPreferences);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(initialPreferences.minimumScore ?? 0);
  const [hideExcluded, setHideExcluded] = useState(true);
  const [minDate, setMinDate] = useState("");

  const jobs = useMemo(() => Object.values(jobsById), [jobsById]);

  const filteredJobs = useMemo<JobListRow[]>(() => {
    const query = search.trim().toLowerCase();

    return jobs
      .map((job) => {
        const fit = scoreJobFit(job, preferences);
        const exclusion = jobMatchesPreferences(job, preferences);

        return {
          job,
          score: fit.score,
          excluded: exclusion.excluded,
          exclusionReasons: exclusion.reasons,
          arrangement: exclusion.arrangement,
          reasonSummary: summarizeJobReason({
            excluded: exclusion.excluded,
            exclusionReasons: exclusion.reasons,
            preferenceSignals: fit.preferenceSignals,
          }),
        };
      })
      .filter(({ job, score, excluded }) => {
        const matchesQuery =
          query.length === 0 ||
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query);
        const minScoreThreshold = Math.max(0, Math.min(100, minScore));
        const matchesScore = excluded && !hideExcluded ? true : score >= minScoreThreshold;
        const jobDate = (job.postedAt ?? job.updatedAt).slice(0, 10);
        const matchesDate = !minDate || jobDate >= minDate;
        const passesExcluded = !hideExcluded || !excluded;

        return matchesQuery && matchesScore && matchesDate && passesExcluded;
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return b.job.updatedAt.localeCompare(a.job.updatedAt);
      });
  }, [hideExcluded, jobs, minDate, minScore, preferences, search]);

  const selectedJobs = useMemo(
    () => selectedJobIds.map((jobId) => jobsById[jobId]).filter((job): job is JobPosting => Boolean(job)),
    [jobsById, selectedJobIds],
  );

  const excludedVisible = filteredJobs.filter((item) => item.excluded).length;

  const handleToggleSelectedJob = (jobId: string) => {
    const nextSelected = toggleJobSelection(selectedJobIds, jobId);
    setSelectedJobIds(nextSelected);

    const currentStore = loadJobHunterStore();
    saveJobHunterStore({
      ...currentStore,
      selectedJobIds: nextSelected,
    });
  };

  const handleSync = async () => {
    setError(null);

    const currentStore = loadJobHunterStore();
    if (currentStore.sources.length === 0) {
      setError("Add at least one job source in Settings before syncing.");
      return;
    }

    setIsSyncing(true);

    try {
      const response = await fetch("/api/job-hunter/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sources: currentStore.sources,
        }),
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
        ...currentStore,
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

      <section className="space-y-2 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Apply Queue ({selectedJobs.length})</h2>
        {selectedJobs.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {selectedJobs.map((job) => (
              <li className="flex items-center justify-between gap-2" key={job.id}>
                <Link className="text-blue-600 hover:underline" href={`/job-hunter/jobs/${encodeURIComponent(job.id)}`}>
                  {job.title} · {job.company}
                </Link>
                <button className="text-xs text-blue-600 hover:underline" onClick={() => handleToggleSelectedJob(job.id)} type="button">
                  Remove from Apply Queue
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-foreground/70">No jobs selected yet. Use “Select for Apply” in the list below.</p>
        )}
      </section>

      <section className="grid gap-3 rounded-lg border border-border/60 p-4 md:grid-cols-2">
        <input
          className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title or company"
          value={search}
        />
        <input
          className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
          onChange={(event) => setMinDate(event.target.value)}
          type="date"
          value={minDate}
        />
      </section>

      <section className="grid gap-3 rounded-lg border border-border/60 p-4 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-xs text-foreground/70">Minimum score</span>
          <input
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            max={100}
            min={0}
            onChange={(event) => setMinScore(Number(event.target.value))}
            type="number"
            value={minScore}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input checked={hideExcluded} onChange={(event) => setHideExcluded(event.target.checked)} type="checkbox" />
          Hide excluded jobs
        </label>
        <p className="text-xs text-foreground/70 md:self-center">
          Defaults: remote {String(preferences.allowRemoteRoles)}, hybrid {String(preferences.allowHybridRoles)}, onsite {String(preferences.allowOnsiteRoles)}, min score {preferences.minimumScore ?? getDefaultPreferences().minimumScore}
        </p>
      </section>

      {!hideExcluded && excludedVisible > 0 ? (
        <section className="rounded-lg border border-amber-500/30 bg-amber-50/40 p-3 text-xs text-amber-900">
          Showing {excludedVisible} excluded job(s). Reasons are based on your targeting preferences.
        </section>
      ) : null}

      {filteredJobs.length > 0 ? (
        <>
          <JobList onToggleSelectedJob={handleToggleSelectedJob} rows={filteredJobs} selectedJobIds={selectedJobIds} />
          {!hideExcluded ? (
            <section className="space-y-2 rounded-lg border border-border/60 p-4 text-xs">
              <p className="font-medium">Excluded reasons</p>
              {filteredJobs
                .filter((item) => item.excluded)
                .map((item) => (
                  <p key={item.job.id}>
                    {item.job.title} at {item.job.company}: {item.exclusionReasons.join(", ")}
                  </p>
                ))}
            </section>
          ) : null}
        </>
      ) : (
        <EmptyState title="No jobs yet" description="Configure sources and click Sync Jobs to pull postings." />
      )}
    </main>
  );
}
