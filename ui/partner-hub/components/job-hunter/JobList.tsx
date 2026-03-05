import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobPosting } from "@/lib/job-hunter/types";

type JobListProps = {
  jobs: JobPosting[];
};

export function JobList({ jobs }: JobListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
          {jobs.map((job) => (
            <li key={job.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">{job.title}</p>
                <p className="text-xs text-foreground/70">{job.company}</p>
              </div>
              <div className="text-xs text-foreground/70">{job.location ?? "Remote / TBD"}</div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
