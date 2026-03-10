import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobPosting, JobWorkArrangement } from "@/lib/job-hunter/types";

export type JobListRow = {
  job: JobPosting;
  score: number;
  excluded: boolean;
  exclusionReasons: string[];
  reasonSummary: string;
  arrangement: JobWorkArrangement;
};

type JobListProps = {
  rows: JobListRow[];
  selectedJobIds: string[];
  onToggleSelectedJob: (jobId: string) => void;
  title?: string;
};

const arrangementLabel: Record<JobWorkArrangement, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
  unknown: "Unknown",
};

export function JobList({ rows, selectedJobIds, onToggleSelectedJob, title = "Synced jobs" }: JobListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="min-w-full divide-y divide-border/60 text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Company</th>
                <th className="px-3 py-2 text-left font-medium">Location</th>
                <th className="px-3 py-2 text-left font-medium">Fit</th>
                <th className="px-3 py-2 text-left font-medium">Queue</th>
                <th className="px-3 py-2 text-left font-medium">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => {
                const { job } = row;
                const selected = selectedJobIds.includes(job.id);

                return (
                  <tr key={job.id}>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <Link className="font-medium text-blue-600 hover:underline" href={`/job-hunter/jobs/${encodeURIComponent(job.id)}`}>
                          {job.title}
                        </Link>
                        <p className="text-xs text-foreground/70">{row.reasonSummary}</p>
                        {job.sourceUrl ? (
                          <a className="text-xs text-foreground/70 underline-offset-2 hover:underline" href={job.sourceUrl} rel="noreferrer" target="_blank">
                            Open source posting
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">{job.company}</td>
                    <td className="px-3 py-2">{job.location ?? "Remote / TBD"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{row.score}/100</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{arrangementLabel[row.arrangement]}</span>
                        {row.excluded ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900" title={row.exclusionReasons.join(", ")}>
                            Excluded
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-start gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? "bg-blue-100 text-blue-800" : "bg-muted text-foreground/70"}`}>
                          {selected ? "Selected" : "Not selected"}
                        </span>
                        <button className="text-xs text-blue-600 hover:underline" onClick={() => onToggleSelectedJob(job.id)} type="button">
                          {selected ? "Remove from Apply Queue" : "Select for Apply"}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">{(job.postedAt ?? job.updatedAt).slice(0, 10)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
