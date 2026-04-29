"use client";

import { useMemo, useState } from "react";

import { getTodaysConversationActions } from "@/lib/job-hunter/conversations";
import { buildConversationTarget, createTargetDraft, isTargetDraftValid, type TargetDraft } from "@/lib/job-hunter/conversationTargets";
import { applySequenceMessageEdit, getDraftedOutreach, getFollowUpsDue, markSequenceSent, skipSequence, snoozeSequence } from "@/lib/job-hunter/conversationUi";
import { generateConversationDraftsFromTopJobs, type ConversationAutomationSummary } from "@/lib/job-hunter/conversationAutomation";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";

import { ActiveConversationsSection, DraftedOutreachSection, FollowUpsDueSection } from "./components/ConversationSections";
import { TargetDraftCard } from "./components/TargetDraftCard";

export default function ConversationsClient() {
  const [store, setStore] = useState(() => loadJobHunterStore());
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [targetDrafts, setTargetDrafts] = useState<Record<string, TargetDraft>>({});
  const [now] = useState(() => new Date());
  const [generationSummary, setGenerationSummary] = useState<ConversationAutomationSummary | null>(null);

  const actions = useMemo(() => getTodaysConversationActions({ today: now, sequences: store.outreachSequences ?? [], targets: store.conversationTargets ?? [], jobs: store.jobs ?? [] }), [now, store]);
  const drafted = useMemo(() => getDraftedOutreach(store.outreachSequences ?? []), [store.outreachSequences]);
  const followUpsDue = useMemo(() => getFollowUpsDue(store.outreachSequences ?? [], now), [now, store.outreachSequences]);

  const persist = (nextStore: ReturnType<typeof loadJobHunterStore>) => {
    setStore(nextStore);
    saveJobHunterStore(nextStore);
  };

  const onEditSave = (sequenceId: string) => {
    const nextText = draftEdits[sequenceId];
    if (typeof nextText !== "string") return;
    persist(applySequenceMessageEdit(store, sequenceId, nextText, new Date()));
  };


  const onGenerateDrafts = () => {
    const result = generateConversationDraftsFromTopJobs({ store, now: new Date() });
    persist(result.store);
    setGenerationSummary(result.summary);
  };

  const onAddTarget = (jobId: string) => {
    const draft = targetDrafts[jobId] ?? createTargetDraft();
    const job = store.jobsById[jobId];
    if (!isTargetDraftValid(job, draft)) return;
    const nowIso = new Date().toISOString();
    const target = buildConversationTarget({ jobId, job, draft, nowIso });
    persist({ ...store, conversationTargets: [...store.conversationTargets, target], conversationTargetsById: { ...store.conversationTargetsById, [target.id]: target } });
    setTargetDrafts((prev) => ({ ...prev, [jobId]: createTargetDraft() }));
  };

  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">Conversations</h1><p className="text-sm text-foreground/70">Review drafts, follow-ups, and active replies without auto-sending.</p></header>
    <section className="space-y-3 rounded-lg border border-border/60 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-foreground/80">Generate conversation briefs and drafts from top-scoring roles.</p><button type="button" onClick={onGenerateDrafts} className="rounded border border-border px-3 py-1.5 font-medium hover:bg-accent">Generate conversation drafts</button></div>{generationSummary ? <p className="text-xs text-foreground/70">Processed {generationSummary.consideredJobs} jobs with {generationSummary.eligibleJobs} eligible top matches; generated {generationSummary.generatedBriefs} briefs, {generationSummary.generatedTargets} targets, and {generationSummary.generatedOutreachDrafts} outreach drafts; skipped {generationSummary.skippedDuplicates} duplicates.</p> : null}<div className="grid gap-3 md:grid-cols-5">{[["Drafts to review", actions.draftsToReview.length], ["Follow-ups due", actions.followUpsDue.length], ["Stale sent no reply", actions.staleSentNoReply.length], ["Active replies", actions.activeReplies.length], ["Roles needing targets", actions.rolesNeedingTargets.length]].map(([label, count]) => <article key={String(label)} className="rounded border border-border/40 p-3"><p className="text-xs text-foreground/70">{label}</p><p className="text-2xl font-semibold">{count}</p></article>)}</div></section>

    <DraftedOutreachSection drafted={drafted} jobsById={store.jobsById} targetsById={store.conversationTargetsById} draftEdits={draftEdits} setDraftEdit={(id, value) => setDraftEdits((prev) => ({ ...prev, [id]: value }))} onEditSave={onEditSave} onCopy={(value) => void navigator.clipboard?.writeText(value)} onMarkSent={(id) => persist(markSequenceSent(store, id, new Date()))} onSkip={(id) => persist(skipSequence(store, id, new Date()))} />

    <FollowUpsDueSection followUpsDue={followUpsDue} jobsById={store.jobsById} targetsById={store.conversationTargetsById} draftEdits={draftEdits} setDraftEdit={(id, value) => setDraftEdits((prev) => ({ ...prev, [id]: value }))} onEditSave={onEditSave} onCopy={(value) => void navigator.clipboard?.writeText(value)} onMarkSent={(id) => persist(markSequenceSent(store, id, new Date()))} onSkip={(id) => persist(skipSequence(store, id, new Date()))} onSnooze={(id) => persist(snoozeSequence(store, id, new Date()))} />

    <ActiveConversationsSection activeReplies={actions.activeReplies} jobsById={store.jobsById} targetsById={store.conversationTargetsById} />

    <section className="space-y-3"><h2 className="text-xl font-semibold">Roles Needing Targets</h2>{actions.rolesNeedingTargets.length === 0 ? <p className="text-sm text-foreground/70">Every company currently has at least one target.</p> : actions.rolesNeedingTargets.map((job) => { const draft = targetDrafts[job.id] ?? createTargetDraft(); return <TargetDraftCard key={job.id} job={job} draft={draft} onChange={(nextDraft) => setTargetDrafts((prev) => ({ ...prev, [job.id]: nextDraft }))} onAdd={() => onAddTarget(job.id)} />; })}</section>
  </main>;
}
