"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/job-hunter/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applicationReducer, createApplicationFromJob, getApplicationChecklist, getApplicationWorkflow, syncWorkflowSelectionWithQueue } from "@/lib/job-hunter/applications";
import { buildApplyPacket, buildApplyPrepItems } from "@/lib/job-hunter/applyPacket";
import type { ApplyPrepItem } from "@/lib/job-hunter/applyPacket";
import { buildApplyHandoffPlan, buildApplyReadinessSummary } from "@/lib/job-hunter/applyHandoff";
import { generateCoverLetterDocxArtifact, generateTailoredResumeDocxArtifact } from "@/lib/job-hunter/docExports";
import { normalizePreferences } from "@/lib/job-hunter/preferences";
import { masterResume } from "@/lib/job-hunter/resume/masterResume";
import { generateTailoringPacket } from "@/lib/job-hunter/resume/tailor";
import { scoreJobFit } from "@/lib/job-hunter/scoring";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";
import { normalizeResumeProfile } from "@/lib/job-hunter/resumeProfile";

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
  const preferences = normalizePreferences(store.preferences);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [applicationById, setApplicationById] = useState(() => store.applicationsById ?? {});
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const fit = useMemo(() => (job ? scoreJobFit(job, preferences) : null), [job, preferences]);
  const tailoringPacket = useMemo(
    () => (job ? generateTailoringPacket(job, store.resumeProfile ?? masterResume, preferences) : null),
    [job, preferences, store.resumeProfile],
  );
  const applyPacket = useMemo(
    () => (job && tailoringPacket ? buildApplyPacket(job, tailoringPacket, store.resumeProfile) : null),
    [job, store.resumeProfile, tailoringPacket],
  );
  const application = job ? applicationById[job.id] : undefined;
  const checklist = application ? getApplicationChecklist(application) : null;
  const workflow = application ? getApplicationWorkflow(application) : null;
  const prepItems = useMemo(() => {
    if (!job || !applyPacket || !tailoringPacket) {
      return [];
    }
    return buildApplyPrepItems(job, applyPacket, tailoringPacket, store.resumeProfile);
  }, [applyPacket, job, store.resumeProfile, tailoringPacket]);

  const handoffPlan = useMemo(() => {
    if (!job) {
      return null;
    }
    return buildApplyHandoffPlan(job, prepItems);
  }, [job, prepItems]);
  const readiness = useMemo(() => {
    if (!job) {
      return null;
    }
    return buildApplyReadinessSummary(job, prepItems, workflow ?? undefined);
  }, [job, prepItems, workflow]);

  const saveApplications = useCallback((next: typeof applicationById) => {
    setApplicationById(next);
    const current = loadJobHunterStore();
    saveJobHunterStore({
      ...current,
      applicationsById: next,
      applications: Object.values(next),
    });
  }, []);

  useEffect(() => {
    if (!job || applicationById[job.id]) {
      return;
    }

    const current = loadJobHunterStore();
    const persisted = current.applicationsById ?? {};
    if (persisted[job.id]) {
      setApplicationById(persisted);
      return;
    }

    saveApplications({
      ...applicationById,
      [job.id]: createApplicationFromJob(job, new Date().toISOString()),
    });
  }, [applicationById, job, saveApplications]);

  useEffect(() => {
    const next = syncWorkflowSelectionWithQueue(applicationById, store.selectedJobIds);
    if (next !== applicationById) {
      saveApplications(next);
    }
  }, [applicationById, saveApplications, store.selectedJobIds]);

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


  const handleDownloadTailoredResumeMarkdown = () => {
    if (!tailoringPacket || !job) {
      return;
    }

    const blob = new Blob([tailoringPacket.tailoredResumeVariant.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job.company}-${job.title}-tailored-resume.md`.replace(/\s+/g, "-").toLowerCase();
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTailoredResumeText = () => {
    if (!tailoringPacket || !job) {
      return;
    }

    const blob = new Blob([tailoringPacket.tailoredResumeVariant.plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${job.company}-${job.title}-tailored-resume.txt`.replace(/\s+/g, "-").toLowerCase();
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadApplyPacket = () => {
    if (!applyPacket) {
      return;
    }

    const blob = new Blob([applyPacket.fullPacketMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${applyPacket.fileBaseName}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadBlob = (content: BlobPart | Uint8Array, type: string, filename: string) => {
    const blobContent = content instanceof Uint8Array
      ? (content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer)
      : content;
    const blob = new Blob([blobContent], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTailoredResumeDocx = async () => {
    if (!job || !tailoringPacket) {
      return;
    }

    const profile = normalizeResumeProfile(store.resumeProfile ?? masterResume);
    const artifact = await generateTailoredResumeDocxArtifact(job, profile, tailoringPacket.tailoredResumeVariant);
    downloadBlob(artifact.bytes, artifact.mimeType, artifact.fileName);
  };

  const handleDownloadCoverLetterDocx = async () => {
    if (!job || !tailoringPacket) {
      return;
    }

    const profile = normalizeResumeProfile(store.resumeProfile ?? masterResume);
    const artifact = await generateCoverLetterDocxArtifact(job, profile, tailoringPacket.coverLetterDraft);
    downloadBlob(artifact.bytes, artifact.mimeType, artifact.fileName);
  };

  const copyText = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  const setWorkflowItem = (item: keyof NonNullable<typeof workflow>, value: boolean) => {
    if (!job) return;
    saveApplications(applicationReducer(applicationById, { type: "setWorkflowItem", jobId: job.id, item, value }));
  };

  const setNotes = (notes: string) => {
    if (!job) return;
    saveApplications(applicationReducer(applicationById, { type: "setNotes", jobId: job.id, notes }));
  };

  const markApplied = () => {
    if (!job) return;
    const withWorkflow = applicationReducer(applicationById, {
      type: "setWorkflowItem",
      jobId: job.id,
      item: "finalExternalSubmitConfirmed",
      value: true,
    });
    const withSnapshot = applicationReducer(withWorkflow, { type: "ensureSnapshotFromJob", jobId: job.id, job });
    const withApplied = applicationReducer(withSnapshot, { type: "setStatus", jobId: job.id, status: "applied" });
    saveApplications(withApplied);
    setWorkspaceMessage("Application marked as applied and snapshot saved.");
  };

  const handlePrepItemAction = (item: ApplyPrepItem) => {
    if (item.actionType === "copy") {
      copyText(item.value);
      return;
    }

    if (item.actionType === "download") {
      if (item.key === "tailoredResumeDocx") {
        void handleDownloadTailoredResumeDocx();
        return;
      }
      if (item.key === "coverLetterDocx") {
        void handleDownloadCoverLetterDocx();
      }
      return;
    }

    if (item.actionType === "open-link" && item.value.trim()) {
      window.open(item.value, "_blank", "noopener,noreferrer");
      setWorkflowItem("externalApplicationOpened", true);
    }
  };

  const prepActionLabelByType: Record<ApplyPrepItem["actionType"], string> = {
    copy: "Copy",
    download: "Download",
    "open-link": "Open",
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
          <CardContent className="space-y-3 text-sm">
            <p><strong>Department:</strong> {job.department ?? "—"}</p>
            <p><strong>Posted:</strong> {(job.postedAt ?? job.updatedAt).slice(0, 10)}</p>
            <p><strong>Remote:</strong> {job.isRemote ? "Yes" : "No / unknown"}</p>
            <p><strong>Employment type:</strong> {job.employmentType ?? "—"}</p>
            <p><strong>Salary:</strong> {job.salaryRange ?? "—"}</p>
            <p><strong>Source provider:</strong> {job.sourceProvider ?? "—"}</p>
            {job.notes ? (
              <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                <p className="font-medium">Posting Snapshot</p>
                <p className="mt-1 text-foreground/80">{job.notes}</p>
              </div>
            ) : null}
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
            <p className="rounded-md border border-emerald-500/40 bg-emerald-50 p-2 text-xs text-emerald-800">
              Base resume profile was not modified. This is a per-job minimal-delta tailored resume variant.
            </p>
            <ul className="list-inside list-disc space-y-1">
              {tailoringPacket.tailoredResumeVariant.deltaSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="font-medium">Tailored resume variant preview</p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">{tailoringPacket.tailoredResumeVariant.markdown}</pre>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownloadTailoredResumeDocx} size="sm" type="button">Download tailored resume (.docx)</Button>
              <Button onClick={handleDownloadTailoredResumeMarkdown} size="sm" type="button">Download tailored resume (md)</Button>
              <Button onClick={handleDownloadTailoredResumeText} size="sm" type="button">Download tailored resume (txt)</Button>
              <Button onClick={() => copyText(tailoringPacket.tailoredResumeVariant.markdown)} size="sm" type="button" variant="secondary">Copy tailored resume (md)</Button>
              <Button onClick={() => copyText(tailoringPacket.tailoredResumeVariant.plainText)} size="sm" type="button" variant="secondary">Copy tailored resume (txt)</Button>
              <Button onClick={handleDownloadMarkdown} size="sm" type="button" variant="secondary">Download tailoring packet</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "Apply" && tailoringPacket && applyPacket ? (
        <Card>
          <CardHeader>
            <CardTitle>Apply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleDownloadCoverLetterDocx} size="sm" type="button">Download cover letter (.docx)</Button>
              <Button onClick={handleDownloadApplyPacket} size="sm" type="button">Download Apply Packet</Button>
              <Button onClick={() => copyText(applyPacket.fullPacketMarkdown)} size="sm" type="button" variant="secondary">Copy Apply Packet</Button>
              <Button onClick={() => copyText(applyPacket.coverLetterMarkdown)} size="sm" type="button" variant="secondary">Copy Cover Letter</Button>
              <Button onClick={() => copyText(applyPacket.screenerAnswersText)} size="sm" type="button" variant="secondary">Copy Screener Answers</Button>
            </div>

            <section className="space-y-3 rounded-md border border-border/60 p-3">
              <h3 className="font-medium">Apply handoff</h3>
              {handoffPlan ? (
                <>
                  <p className="text-xs text-foreground/80">Provider: <strong>{handoffPlan.providerLabel}</strong></p>
                  {readiness ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      <p className="rounded border border-border/60 bg-muted/30 px-2 py-1 text-xs">Resume ready: {readiness.resumeReady ? "Yes" : "Not yet"}</p>
                      <p className="rounded border border-border/60 bg-muted/30 px-2 py-1 text-xs">Cover letter ready: {readiness.coverLetterReady ? "Yes" : "Not yet"}</p>
                      <p className="rounded border border-border/60 bg-muted/30 px-2 py-1 text-xs">Candidate profile ready: {readiness.candidateProfileReady ? "Yes" : "Not yet"}</p>
                      <p className="rounded border border-border/60 bg-muted/30 px-2 py-1 text-xs">Provider handoff ready: {readiness.providerHandoffReady ? "Yes" : "Not yet"}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="font-medium">Recommended steps</p>
                    <ol className="list-inside list-decimal space-y-1 text-xs text-foreground/80">
                      {handoffPlan.likelySteps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium">Prep hints</p>
                    <ul className="list-inside list-disc space-y-1 text-xs text-foreground/80">
                      {handoffPlan.prepHints.map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Provider-aware prep actions</p>
                    <div className="space-y-3">
                      {handoffPlan.groupedPrepItems.map((group) => (
                        <div key={group.group} className="space-y-2">
                          <p className="text-xs font-medium text-foreground/80">{group.label}</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            {group.items.map((item) => (
                              <div key={item.key} className="space-y-1 rounded border border-border/60 bg-muted/20 p-2">
                                <Button onClick={() => handlePrepItemAction(item)} size="sm" type="button" variant="secondary">
                                  {prepActionLabelByType[item.actionType]} {item.label}
                                </Button>
                                <p className="text-[11px] text-foreground/70">Priority: {item.priority === "required-first" ? "Required first" : "Recommended"}</p>
                                {item.providerHint ? <p className="text-[11px] text-foreground/70">{item.providerHint}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {handoffPlan.recommendedArtifacts.map((artifact) => (
                      <p key={artifact} className="rounded border border-border/60 bg-muted/30 px-2 py-1 text-xs">Artifact: {artifact}</p>
                    ))}
                  </div>
                  {handoffPlan.recommendedCopyItems.length > 0 ? (
                    <div>
                      <p className="font-medium">Recommended copy bundles</p>
                      <ul className="list-inside list-disc space-y-1 text-xs text-foreground/80">
                        {handoffPlan.recommendedCopyItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : null}
              {job.sourceUrl ? (
                <Button
                  onClick={() => {
                    window.open(job.sourceUrl, "_blank", "noopener,noreferrer");
                    setWorkflowItem("externalApplicationOpened", true);
                  }}
                  size="sm"
                  type="button"
                >
                  Open external application
                </Button>
              ) : null}
            </section>

            <section className="space-y-3 rounded-md border border-border/60 p-3">
              <h3 className="font-medium">Guided apply workflow</h3>
              {workflow ? (
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="flex items-center gap-2"><input checked={workflow.selectedForApply} onChange={(e) => setWorkflowItem("selectedForApply", e.target.checked)} type="checkbox" />Selected for apply</label>
                  <label className="flex items-center gap-2"><input checked={workflow.tailoredResumeReady} onChange={(e) => setWorkflowItem("tailoredResumeReady", e.target.checked)} type="checkbox" />Tailored resume ready</label>
                  <label className="flex items-center gap-2"><input checked={workflow.coverLetterReady} onChange={(e) => setWorkflowItem("coverLetterReady", e.target.checked)} type="checkbox" />Cover letter ready</label>
                  <label className="flex items-center gap-2"><input checked={workflow.screenerAnswersReady} onChange={(e) => setWorkflowItem("screenerAnswersReady", e.target.checked)} type="checkbox" />Screener answers ready</label>
                  <label className="flex items-center gap-2"><input checked={workflow.externalApplicationOpened} onChange={(e) => setWorkflowItem("externalApplicationOpened", e.target.checked)} type="checkbox" />External application opened</label>
                  <label className="flex items-center gap-2"><input checked={workflow.tailoredResumeUploaded} onChange={(e) => setWorkflowItem("tailoredResumeUploaded", e.target.checked)} type="checkbox" />Tailored resume uploaded</label>
                  <label className="flex items-center gap-2"><input checked={workflow.customQuestionsCompleted} onChange={(e) => setWorkflowItem("customQuestionsCompleted", e.target.checked)} type="checkbox" />Custom questions completed</label>
                  <label className="flex items-center gap-2"><input checked={workflow.finalExternalSubmitConfirmed} onChange={(e) => setWorkflowItem("finalExternalSubmitConfirmed", e.target.checked)} type="checkbox" />Final external submit confirmed</label>
                  <label className="flex items-center gap-2"><input checked={workflow.followUpScheduled} onChange={(e) => setWorkflowItem("followUpScheduled", e.target.checked)} type="checkbox" />Follow-up scheduled</label>
                </div>
              ) : null}
              {checklist ? (
                <p className="text-xs text-foreground/70">
                  Legacy checklist mirror: resume {String(checklist.resumeReviewed)}, cover letter {String(checklist.coverLetterReviewed)}, screener {String(checklist.screenerAnswersReviewed)}.
                </p>
              ) : null}
              <label className="block text-xs text-foreground/70">
                Notes
                <textarea
                  className="mt-1 min-h-24 w-full rounded-md border border-border/60 bg-background px-2 py-1 text-sm"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Track what you actually submitted, recruiter details, and follow-up plan."
                  value={application?.notes ?? ""}
                />
              </label>
              <div className="flex items-center gap-3">
                <Button onClick={markApplied} size="sm" type="button">Mark as Applied</Button>
                {application?.appliedAt ? <span className="text-xs text-foreground/70">Applied at {new Date(application.appliedAt).toLocaleString()}</span> : null}
              </div>
              {workspaceMessage ? <p className="text-xs text-emerald-700">{workspaceMessage}</p> : null}
            </section>

            <p className="font-medium">Apply Packet Preview</p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">{applyPacket.fullPacketMarkdown}</pre>
            <p className="font-medium">Cover-letter draft</p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3">{applyPacket.coverLetterMarkdown}</pre>
            <p className="font-medium">Common screener answers</p>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3">{applyPacket.screenerAnswersText}</pre>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
