"use client";

import { useState } from "react";

import { EmptyState } from "@/components/job-hunter/EmptyState";
import { JobList } from "@/components/job-hunter/JobList";
import { Button } from "@/components/ui/button";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";
import type { JobPosting } from "@/lib/job-hunter/types";

const createManualJob = (): JobPosting => {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "New saved job",
    company: "Add company",
    source: "manual",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export default function JobHunterJobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>(() => loadJobHunterStore().jobs);

  const handleAddManualJob = () => {
    const newJob = createManualJob();
    const nextJobs = [newJob, ...jobs];

    setJobs(nextJobs);
    saveJobHunterStore({
      ...loadJobHunterStore(),
      jobs: nextJobs,
    });
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-foreground/70">Saved jobs are stored locally in your browser.</p>
        </div>
        <Button onClick={handleAddManualJob} type="button">
          Add job manually
        </Button>
      </header>

      {jobs.length > 0 ? (
        <JobList jobs={jobs} />
      ) : (
        <EmptyState
          title="No saved jobs yet"
          description="Start by adding a job manually. In the next phase, this page will support richer job details and import flows."
          actionLabel="Add job manually"
          onAction={handleAddManualJob}
        />
      )}
    </main>
  );
}
