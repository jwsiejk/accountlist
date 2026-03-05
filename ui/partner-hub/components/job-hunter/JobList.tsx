import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobPosting } from "@/lib/job-hunter/types";

type JobListProps = {
  jobs: JobPosting[];
};

export function JobList({ jobs }: JobListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Synced jobs ({jobs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="min-w-full divide-y divide-border/60 text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Title</th>
                <th className="px-3 py-2 text-left font-medium">Company</th>
                <th className="px-3 py-2 text-left font-medium">Location</th>
                <th className="px-3 py-2 text-left font-medium">Department</th>
                <th className="px-3 py-2 text-left font-medium">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <Link className="font-medium text-blue-600 hover:underline" href={`/job-hunter/jobs/${encodeURIComponent(job.id)}`}>
                        {job.title}
                      </Link>
                      {job.sourceUrl ? (
                        <a className="text-xs text-foreground/70 underline-offset-2 hover:underline" href={job.sourceUrl} rel="noreferrer" target="_blank">
                          Open source posting
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">{job.company}</td>
                  <td className="px-3 py-2">{job.location ?? "Remote / TBD"}</td>
                  <td className="px-3 py-2">{job.department ?? "—"}</td>
                  <td className="px-3 py-2">{(job.postedAt ?? job.updatedAt).slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
