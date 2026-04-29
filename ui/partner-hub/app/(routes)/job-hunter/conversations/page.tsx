"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getTodaysConversationActions } from "@/lib/job-hunter/conversations";
import { applySequenceMessageEdit, getDraftedOutreach, getFollowUpsDue, getOutreachPreview, markSequenceSent, resolveSequenceContext, skipSequence, snoozeSequence } from "@/lib/job-hunter/conversationUi";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";
import type { ConversationTarget, ConversationTargetRelationship, ConversationTargetSource } from "@/lib/job-hunter/types";

const createTargetDraft = () => ({ name: "", title: "", relationshipType: "unknown" as ConversationTargetRelationship, profileUrl: "", email: "", source: "manual" as ConversationTargetSource, notes: "" });

export default function JobHunterConversationsPage() {
  const [store, setStore] = useState(() => loadJobHunterStore());
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [targetDrafts, setTargetDrafts] = useState<Record<string, ReturnType<typeof createTargetDraft>>>({});
  const now = new Date();

  const actions = useMemo(() => getTodaysConversationActions({ today: now, sequences: store.outreachSequences ?? [], targets: store.conversationTargets ?? [], jobs: store.jobs ?? [] }), [now, store]);
  const drafted = useMemo(() => getDraftedOutreach(store.outreachSequences ?? []), [store.outreachSequences]);
  const followUpsDue = useMemo(() => getFollowUpsDue(store.outreachSequences ?? [], now), [now, store.outreachSequences]);
  const activeReplies = actions.activeReplies;

  const persist = (nextStore: ReturnType<typeof loadJobHunterStore>) => {
    setStore(nextStore);
    saveJobHunterStore(nextStore);
  };

  const onEditSave = (sequenceId: string) => {
    const nextText = draftEdits[sequenceId];
    if (typeof nextText !== "string") return;
    persist(applySequenceMessageEdit(store, sequenceId, nextText, new Date()));
  };

  const onAddTarget = (jobId: string) => {
    const draft = targetDrafts[jobId] ?? createTargetDraft();
    const job = store.jobsById[jobId];
    if (!job || !draft.name.trim()) return;
    const nowIso = new Date().toISOString();
    const target: ConversationTarget = {
      id: `${jobId}:manual:${draft.name.trim().toLowerCase().replace(/\W+/g, "-")}`,
      company: job.company,
      name: draft.name.trim(),
      title: draft.title.trim() || undefined,
      relationshipType: draft.relationshipType,
      profileUrl: draft.profileUrl.trim() || undefined,
      email: draft.email.trim() || undefined,
      source: draft.source,
      confidence: 50,
      notes: draft.notes.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const nextStore = {
      ...store,
      conversationTargets: [...store.conversationTargets, target],
      conversationTargetsById: { ...store.conversationTargetsById, [target.id]: target },
    };
    persist(nextStore);
    setTargetDrafts((prev) => ({ ...prev, [jobId]: createTargetDraft() }));
  };

  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <header className="space-y-2"><h1 className="text-2xl font-semibold">Conversations</h1><p className="text-sm text-foreground/70">Review drafts, follow-ups, and active replies without auto-sending.</p></header>

    <section className="grid gap-3 rounded-lg border border-border/60 p-4 md:grid-cols-5 text-sm">{[
      ["Drafts to review", actions.draftsToReview.length],
      ["Follow-ups due", actions.followUpsDue.length],
      ["Stale sent no reply", actions.staleSentNoReply.length],
      ["Active replies", actions.activeReplies.length],
      ["Roles needing targets", actions.rolesNeedingTargets.length],
    ].map(([label, count]) => <article key={String(label)} className="rounded border border-border/40 p-3"><p className="text-xs text-foreground/70">{label}</p><p className="text-2xl font-semibold">{count}</p></article>)}</section>

    <section className="space-y-3"><h2 className="text-xl font-semibold">Drafted Outreach</h2>{drafted.length === 0 ? <p className="text-sm text-foreground/70">No drafts or queued outreach yet.</p> : drafted.map((sequence) => { const ctx = resolveSequenceContext(sequence, store.jobsById, store.conversationTargetsById); const value = draftEdits[sequence.id] ?? getOutreachPreview(sequence); return <article key={sequence.id} className="space-y-2 rounded-lg border border-border/60 p-4 text-sm"><p><strong>{ctx.company}</strong>{ctx.title ? ` · ${ctx.title}` : ""}{ctx.target?.name ? ` · ${ctx.target.name}` : ""}{ctx.target?.relationshipType ? ` · ${ctx.target.relationshipType}` : ""}</p><p className="text-xs text-foreground/70">{sequence.channel} · {sequence.stage}</p><textarea className="min-h-24 w-full rounded border p-2" value={value} onChange={(event) => setDraftEdits((prev) => ({ ...prev, [sequence.id]: event.target.value }))} /><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => onEditSave(sequence.id)}>Edit message inline</Button><Button type="button" variant="secondary" onClick={() => void navigator.clipboard?.writeText(value)}>Copy message</Button><Button type="button" onClick={() => persist(markSequenceSent(store, sequence.id, new Date()))}>Mark Sent</Button><Button type="button" variant="outline" onClick={() => persist(skipSequence(store, sequence.id, new Date()))}>Skip</Button></div></article>; })}</section>

    <section className="space-y-3"><h2 className="text-xl font-semibold">Follow-ups Due</h2>{followUpsDue.length === 0 ? <p className="text-sm text-foreground/70">No follow-ups due today.</p> : followUpsDue.map((sequence) => { const ctx = resolveSequenceContext(sequence, store.jobsById, store.conversationTargetsById); const value = draftEdits[sequence.id] ?? getOutreachPreview(sequence); return <article key={sequence.id} className="space-y-2 rounded-lg border border-border/60 p-4 text-sm"><p><strong>{ctx.company}</strong>{ctx.target?.name ? ` · ${ctx.target.name}` : ""}</p><p className="text-xs text-foreground/70">Due {sequence.dueAt ? new Date(sequence.dueAt).toLocaleDateString() : "unknown"} · {sequence.stage}</p><textarea className="min-h-24 w-full rounded border p-2" value={value} onChange={(event) => setDraftEdits((prev) => ({ ...prev, [sequence.id]: event.target.value }))} /><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => onEditSave(sequence.id)}>Edit</Button><Button type="button" variant="secondary" onClick={() => void navigator.clipboard?.writeText(value)}>Copy</Button><Button type="button" onClick={() => persist(markSequenceSent(store, sequence.id, new Date()))}>Mark Sent</Button><Button type="button" variant="outline" onClick={() => persist(skipSequence(store, sequence.id, new Date()))}>Skip</Button><Button type="button" variant="outline" onClick={() => persist(snoozeSequence(store, sequence.id, new Date()))}>Snooze 2 business days</Button></div></article>; })}</section>

    <section className="space-y-3"><h2 className="text-xl font-semibold">Active Conversations</h2>{activeReplies.length === 0 ? <p className="text-sm text-foreground/70">No active replies yet.</p> : activeReplies.map((sequence) => { const ctx = resolveSequenceContext(sequence, store.jobsById, store.conversationTargetsById); return <article key={sequence.id} className="rounded-lg border border-border/60 p-4 text-sm"><p><strong>{ctx.target?.name ?? "Unknown contact"}</strong> · {ctx.company}</p><p className="text-xs text-foreground/70">{sequence.channel} · replied {sequence.repliedAt ? new Date(sequence.repliedAt).toLocaleString() : "unknown time"}</p><p className="mt-2 whitespace-pre-wrap">{getOutreachPreview(sequence)}</p></article>; })}</section>

    <section className="space-y-3"><h2 className="text-xl font-semibold">Roles Needing Targets</h2>{actions.rolesNeedingTargets.length === 0 ? <p className="text-sm text-foreground/70">Every company currently has at least one target.</p> : actions.rolesNeedingTargets.map((job) => { const draft = targetDrafts[job.id] ?? createTargetDraft(); return <article key={job.id} className="space-y-2 rounded-lg border border-border/60 p-4 text-sm"><p><strong>{job.company}</strong> · {job.title}</p><p className="text-xs text-foreground/70">{typeof (job as { score?: number }).score === "number" ? `Score ${(job as { score?: number }).score}` : "Score unavailable"}</p><div className="grid gap-2 md:grid-cols-2"><input placeholder="name" className="rounded border p-2" value={draft.name} onChange={(e) => setTargetDrafts((prev) => ({ ...prev, [job.id]: { ...draft, name: e.target.value } }))} /><input placeholder="title" className="rounded border p-2" value={draft.title} onChange={(e) => setTargetDrafts((prev) => ({ ...prev, [job.id]: { ...draft, title: e.target.value } }))} /><input placeholder="relationshipType" className="rounded border p-2" value={draft.relationshipType} onChange={(e) => setTargetDrafts((prev) => ({ ...prev, [job.id]: { ...draft, relationshipType: (e.target.value as ConversationTargetRelationship) || "unknown" } }))} /><input placeholder="profileUrl" className="rounded border p-2" value={draft.profileUrl} onChange={(e) => setTargetDrafts((prev) => ({ ...prev, [job.id]: { ...draft, profileUrl: e.target.value } }))} /><input placeholder="email" className="rounded border p-2" value={draft.email} onChange={(e) => setTargetDrafts((prev) => ({ ...prev, [job.id]: { ...draft, email: e.target.value } }))} /><input placeholder="source" className="rounded border p-2" value={draft.source} onChange={(e) => setTargetDrafts((prev) => ({ ...prev, [job.id]: { ...draft, source: (e.target.value as ConversationTargetSource) || "manual" } }))} /></div><textarea placeholder="notes" className="min-h-20 w-full rounded border p-2" value={draft.notes} onChange={(e) => setTargetDrafts((prev) => ({ ...prev, [job.id]: { ...draft, notes: e.target.value } }))} /><Button type="button" onClick={() => onAddTarget(job.id)}>Add target</Button></article>; })}</section>
  </main>;
}
