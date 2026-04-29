"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getTodaysConversationActions } from "@/lib/job-hunter/conversations";
import { buildConversationTarget, createTargetDraft, isTargetDraftValid, type TargetDraft } from "@/lib/job-hunter/conversationTargets";
import { applySequenceMessageEdit, getDraftedOutreach, getFollowUpsDue, markSequenceSent, skipSequence, snoozeSequence } from "@/lib/job-hunter/conversationUi";
import { generateConversationDraftsFromTopJobs, type ConversationAutomationSummary } from "@/lib/job-hunter/conversationAutomation";
import { buildDailyConversationActions } from "@/lib/job-hunter/conversationActions";
import { addConversationOutcome } from "@/lib/job-hunter/conversationOutcomes";
import { calculateConversationDailyProgress, calculateConversationExecutionMetrics, getDefaultConversationDailyQuota } from "@/lib/job-hunter/conversationMetrics";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";

import { ActiveConversationsSection, DraftedOutreachSection, FollowUpsDueSection, PipelineOutcomesPanel } from "./components/ConversationSections";
import { TargetDraftCard } from "./components/TargetDraftCard";
import { DailyActionPlan } from "./components/DailyActionPlan";
import { ConversationMetricsPanel } from "./components/ConversationMetricsPanel";

const LAUNCH_STEPS = [
  "1. Start outreach pipeline",
  "2. Add/select opportunity",
  "3. Add/approve outreach candidates",
  "4. Generate drafts",
  "5. Review/edit drafts",
  "6. Copy/send manually",
  "7. Mark sent",
  "8. Track follow-up/outcome",
] as const;

export default function ConversationsClient() {
  const [store, setStore] = useState(() => loadJobHunterStore());
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [targetDrafts, setTargetDrafts] = useState<Record<string, TargetDraft>>({});
  const [now] = useState(() => new Date());
  const [generationSummary, setGenerationSummary] = useState<ConversationAutomationSummary | null>(null);

  const actions = useMemo(() => getTodaysConversationActions({ today: now, sequences: store.outreachSequences ?? [], targets: store.conversationTargets ?? [], jobs: store.jobs ?? [] }), [now, store]);
  const drafted = useMemo(() => getDraftedOutreach(store.outreachSequences ?? []), [store.outreachSequences]);
  const followUpsDue = useMemo(() => getFollowUpsDue(store.outreachSequences ?? [], now), [now, store.outreachSequences]);
  const dailyActions = useMemo(() => buildDailyConversationActions({ jobsById: store.jobsById, targetsById: store.conversationTargetsById, actions, maxActions: 10 }), [actions, store.conversationTargetsById, store.jobsById]);
  const dailyQuota = useMemo(() => getDefaultConversationDailyQuota(), []);
  const executionMetrics = useMemo(() => calculateConversationExecutionMetrics({ today: now, window: "today", sequences: store.outreachSequences ?? [] }), [now, store.outreachSequences]);
  const dailyProgress = useMemo(() => calculateConversationDailyProgress({ metrics: executionMetrics, quota: dailyQuota }), [dailyQuota, executionMetrics]);
  const outcomeCounts = useMemo(() => (store.conversationOutcomes ?? []).reduce<Record<string, number>>((acc, outcome) => {
    acc[outcome.type] = (acc[outcome.type] ?? 0) + 1;
    return acc;
  }, {}), [store.conversationOutcomes]);
  const hasPipelineData = (store.outreachSequences?.length ?? 0) > 0 || (store.conversationTargets?.length ?? 0) > 0 || (store.conversationBriefs?.length ?? 0) > 0;

  const persist = (nextStore: ReturnType<typeof loadJobHunterStore>) => {
    setStore(nextStore);
    saveJobHunterStore(nextStore);
  };

  const onEditSave = (sequenceId: string) => {
    const nextText = draftEdits[sequenceId];
    if (typeof nextText !== "string") return;
    persist(applySequenceMessageEdit(store, sequenceId, nextText, new Date()));
  };

  const onActionSkip = (sequenceId?: string) => {
    if (!sequenceId) return;
    persist(skipSequence(store, sequenceId, new Date()));
  };

  const onActionMarkSent = (sequenceId?: string) => {
    if (!sequenceId) return;
    persist(markSequenceSent(store, sequenceId, new Date()));
  };

  const onGenerateDrafts = () => {
    const result = generateConversationDraftsFromTopJobs({ store, now: new Date() });
    persist(result.store);
    setGenerationSummary(result.summary);
  };
  const onMarkOutcome = (sequenceId: string, type: "reply_received" | "conversation_started" | "recruiter_screen" | "interview_scheduled" | "rejected" | "closed_no_response") => {
    persist(addConversationOutcome(store, sequenceId, type, new Date()));
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

    {!hasPipelineData ? <section className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm"><h2 className="text-xl font-semibold">Guided outreach launch</h2><Button type="button" onClick={onGenerateDrafts}>Start outreach pipeline</Button><p className="text-foreground/80">Add a target company or role, approve the outreach candidates, then generate editable messages. Nothing is sent automatically.</p><ol className="list-decimal space-y-1 pl-5 text-foreground/80">{LAUNCH_STEPS.map((step) => <li key={step}>{step}</li>)}</ol></section> : null}

    <ConversationMetricsPanel metrics={executionMetrics} progress={dailyProgress} />

    <DailyActionPlan dailyActions={dailyActions} draftEdits={draftEdits} setDraftEdits={setDraftEdits} store={store} onActionMarkSent={onActionMarkSent} onActionSkip={onActionSkip} />

    <section className="space-y-3 rounded-lg border border-border/60 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-foreground/80">Phase 7 automation is approval-gated: candidate details, generated messages, copy/send, mark sent, and outcome tracking are always user-confirmed.</p><button type="button" onClick={onGenerateDrafts} className="rounded border border-border px-3 py-1.5 font-medium hover:bg-accent">Start outreach pipeline</button></div>{generationSummary ? <p className="text-xs text-foreground/70">Processed {generationSummary.consideredJobs} jobs with {generationSummary.eligibleJobs} eligible top matches; generated {generationSummary.generatedBriefs} briefs, {generationSummary.generatedTargets} targets, and {generationSummary.generatedOutreachDrafts} outreach drafts; skipped {generationSummary.skippedDuplicates} duplicates.</p> : null}<div className="grid gap-3 md:grid-cols-5">{[["Drafts to review", actions.draftsToReview.length], ["Follow-ups due", actions.followUpsDue.length], ["Stale sent no reply", actions.staleSentNoReply.length], ["Active replies", actions.activeReplies.length], ["Roles needing targets", actions.rolesNeedingTargets.length]].map(([label, count]) => <article key={String(label)} className="rounded border border-border/40 p-3"><p className="text-xs text-foreground/70">{label}</p><p className="text-2xl font-semibold">{count}</p></article>)}</div></section>

    <DraftedOutreachSection drafted={drafted} jobsById={store.jobsById} targetsById={store.conversationTargetsById} draftEdits={draftEdits} setDraftEdit={(id, value) => setDraftEdits((prev) => ({ ...prev, [id]: value }))} onEditSave={onEditSave} onCopy={(value) => void navigator.clipboard?.writeText(value)} onMarkSent={(id) => persist(markSequenceSent(store, id, new Date()))} onSkip={(id) => persist(skipSequence(store, id, new Date()))} />

    <FollowUpsDueSection followUpsDue={followUpsDue} jobsById={store.jobsById} targetsById={store.conversationTargetsById} draftEdits={draftEdits} setDraftEdit={(id, value) => setDraftEdits((prev) => ({ ...prev, [id]: value }))} onEditSave={onEditSave} onCopy={(value) => void navigator.clipboard?.writeText(value)} onMarkSent={(id) => persist(markSequenceSent(store, id, new Date()))} onSkip={(id) => persist(skipSequence(store, id, new Date()))} onSnooze={(id) => persist(snoozeSequence(store, id, new Date()))} />

    <ActiveConversationsSection activeReplies={actions.activeReplies} jobsById={store.jobsById} targetsById={store.conversationTargetsById} onMarkOutcome={onMarkOutcome} />
    <PipelineOutcomesPanel outcomeCounts={outcomeCounts} />

    <section id="roles-needing-targets" className="space-y-3"><h2 className="text-xl font-semibold">Roles Needing Targets</h2><p className="text-xs text-foreground/70">If exact people are unknown, use placeholders: Recruiter target needed, Hiring manager target needed, Employee/referral target needed. Then fill name, title, LinkedIn URL, email, and notes.</p>{actions.rolesNeedingTargets.length === 0 ? <p className="text-sm text-foreground/70">Every company currently has at least one target.</p> : actions.rolesNeedingTargets.map((job) => { const draft = targetDrafts[job.id] ?? createTargetDraft(); return <TargetDraftCard key={job.id} job={job} draft={draft} onChange={(nextDraft) => setTargetDrafts((prev) => ({ ...prev, [job.id]: nextDraft }))} onAdd={() => onAddTarget(job.id)} />; })}</section>
  </main>;
}
