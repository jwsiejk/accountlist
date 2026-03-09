"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/job-hunter/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { masterResume } from "@/lib/job-hunter/resume/masterResume";
import { generateTailoringPacket } from "@/lib/job-hunter/resume/tailor";
import { scoreJobFit } from "@/lib/job-hunter/scoring";
import { loadJobHunterStore } from "@/lib/job-hunter/storage";

type PageProps = {
  params: {
    jobId: string;
  };
};

const tabs = ["Overview", "Fit", "Tailor", "Apply"] as const;
type Tab = (typeof tabs)[number];

export default function JobDetailPage({ params }: PageProps) {
  const decodedJobId = decodeURIComponent(params.jobId);
  const store = loadJobHunterStore();
  const job = store.jobsById[decodedJobId];
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const fit = useMemo(() => (job ? scoreJobFit(job) : null), [job]);
  const tailoringPacket = useMemo(
    () => (job ? generateTailoringPacket(job, store.resumeProfile ?? masterResume) : null),
    [job, store.resumeProfile],
  );

  const handleDownloadMarkdown = () => {
    if (!tailoringPacket || !job) {
      return;
    }

    const blob = new Blob([tailoringPacket.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job.company}-${job.title}-tailoring.md`.replace(/\s+/g, "-").toLowerCase();
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!job) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <EmptyState title="Job not found" description="The selected job is not present in local storage. Re-sync jobs and try again." />
        <Link className="text-sm text-blue-600 hover:underline" href="/job-hunter/jobs">
          Back to jobs
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-2">
        <Link className="text-sm text-blue-600 hover:underline" href="/job-hunter/jobs">
          ← Back to jobs
        </Link>
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <p className="text-sm text-foreground/70">
          {job.company} · {job.location ?? "Remote / TBD"}
        </p>
      </header>

      <section className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        {tabs.map((tab) => (
          <Button key={tab} onClick={() => setActiveTab(tab)} size="sm" type="button" variant={activeTab === tab ? "primary" : "ghost"}>
            {tab}
          </Button>
        ))}
      </section>

      {activeTab === "Overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Department:</strong> {job.department ?? "—"}</p>
            <p><strong>Posted:</strong> {(job.postedAt ?? job.updatedAt).slice(0, 10)}</p>
            <p><strong>Remote:</strong> {job.isRemote ? "Yes" : "No / unknown"}</p>
            {job.sourceUrl ? <a className="text-blue-600 hover:underline" href={job.sourceUrl} rel="noreferrer" target="_blank">Open job posting</a> : null}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Fit" && fit ? (
        <Card>
          <CardHeader>
            <CardTitle>Fit ({fit.score}/100)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <p className="mb-2 font-medium">Top matched keywords</p>
              <ul className="list-inside list-disc space-y-1">
                {fit.matched.map((item) => (
                  <li key={item.keyword}>{item.keyword} (+{item.weight})</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium">Top missing keywords</p>
              <ul className="list-inside list-disc space-y-1">
                {fit.missing.map((item) => (
                  <li key={item.keyword}>{item.keyword} ({item.weight})</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Tailor" && tailoringPacket ? (
        <Card>
          <CardHeader>
            <CardTitle>Tailor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>{tailoringPacket.tailoredSummary}</p>
            <ul className="list-inside list-disc space-y-1">
              {tailoringPacket.tailoredBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <Button onClick={handleDownloadMarkdown} size="sm" type="button">Download markdown packet</Button>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Apply" && tailoringPacket ? (
        <Card>
          <CardHeader>
            <CardTitle>Apply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="font-medium">Cover-letter draft</p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3">{tailoringPacket.coverLetterDraft}</pre>
            <p className="font-medium">Common screener answers</p>
            <ul className="space-y-2">
              {tailoringPacket.screenerAnswers.map((item) => (
                <li key={item.question}>
                  <p className="font-medium">{item.question}</p>
                  <p>{item.answer}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
