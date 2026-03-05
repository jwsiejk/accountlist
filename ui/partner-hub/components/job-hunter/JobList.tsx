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
                    <a className="font-medium text-blue-600 hover:underline" href={job.sourceUrl} rel="noreferrer" target="_blank">
                      {job.title}
                    </a>
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
