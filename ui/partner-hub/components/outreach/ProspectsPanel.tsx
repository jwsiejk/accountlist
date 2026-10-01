"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { clsx } from "clsx";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import { Button } from "@/components/ui/button";
import { previewMerge, PLACEHOLDER_HINT } from "./mergePreview";
import { HistoryTimeline, type HistoryState } from "./HistoryTimeline";
import { StepCell } from "./SequenceCells";
import type { Template } from "./TemplatesPanel";
import { browserTimeZone, contactName, type BatchOverview, type Contact, type Overview, type ProspectStatus } from "./types";

const STATUS_STYLES: Record<ProspectStatus, string> = {
  PENDING: "bg-muted text-foreground/60",
  SENDING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  OPENED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  CLICKED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  REPLIED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  BOUNCED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

type SendStep = 1 | 2 | 3;
/** Which batch is on screen: one batch's id, the Unassigned bucket, or everything. */
type View = number | "unassigned" | "all";

const viewOf = (b: BatchOverview): View => (b.id === null ? "unassigned" : b.id);

/**
 * Batches tab. Campaign -> Batch -> contacts, with Email 1 -> 2 -> 3 progress
 * per contact. From here you import a CSV into a batch (new or existing), send
 * a chosen email in the sequence to a selection of contacts, move contacts
 * between batches (their email history moves with them), or remove them.
 */
export function ProspectsPanel({ campaignId }: { campaignId: number }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [sendStep, setSendStep] = useState<SendStep>(1);
  const [view, setView] = useState<View>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resettingIds, setResettingIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didPickInitialView = useRef(false);

  const [importTarget, setImportTarget] = useState<string>("new"); // "new" or a batch id
  const [newBatchName, setNewBatchName] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [newBatchInput, setNewBatchInput] = useState("");
  const [moveTarget, setMoveTarget] = useState<string>(""); // "", "unassigned", "new", or a batch id
  const [moveNewName, setMoveNewName] = useState("");

  const [editingTiming, setEditingTiming] = useState(false);
  const [timing, setTiming] = useState({ e2: 3, e3: 4 });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyById, setHistoryById] = useState<Record<number, HistoryState>>({});

  const [reviewOpen, setReviewOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftHtml, setDraftHtml] = useState("");

  async function toggleHistory(prospectId: number) {
    if (expandedId === prospectId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(prospectId);

    // Always refetch fresh on open -- new events can land any time the
    // dashboard just sits open, so caching this across opens would risk
    // silently showing a stale snapshot from before the very event being
    // checked for.
    setHistoryById((prev) => ({ ...prev, [prospectId]: { ...prev[prospectId], loading: true } }));
    try {
      const res = await fetch(withBasePath(`/api/outreach/prospects/${prospectId}/history`), {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!data || !res.ok || !data.ok) {
        setHistoryById((prev) => ({
          ...prev,
          [prospectId]: { loading: false, error: data?.error ?? `HTTP ${res.status}`, messages: prev[prospectId]?.messages },
        }));
        return;
      }
      setHistoryById((prev) => ({ ...prev, [prospectId]: { loading: false, messages: data.messages } }));
    } catch (err) {
      setHistoryById((prev) => ({
        ...prev,
        [prospectId]: {
          loading: false,
          error: err instanceof Error ? err.message : "network error",
          messages: prev[prospectId]?.messages,
        },
      }));
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath(`/api/outreach/overview?campaignId=${campaignId}`), { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!data?.ok) return;
      const next = data as Overview & { ok: true };
      setOverview(next);

      // Forget selections for contacts that no longer exist (removed here or elsewhere).
      const existing = new Set(next.batches.flatMap((b) => b.contacts.map((c) => c.id)));
      setSelected((prev) => {
        const kept = new Set(Array.from(prev).filter((id) => existing.has(id)));
        return kept.size === prev.size ? prev : kept;
      });

      // First load: open on the newest real batch (that's the one being worked on).
      if (!didPickInitialView.current) {
        didPickInitialView.current = true;
        const real = next.batches.filter((b) => b.id !== null);
        if (real.length > 0) setView(real[real.length - 1].id as number);
      }
      // A batch that vanished (deleted) shouldn't leave the view pointing at nothing.
      setView((v) => (v === "all" || next.batches.some((b) => viewOf(b) === v) ? v : "all"));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadTemplates = useCallback(async () => {
    const res = await fetch(withBasePath(`/api/outreach/templates?campaignId=${campaignId}`), {
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setTemplates(data.templates);
      setTemplateId((prev) => prev || data.templates[0]?.id || "");
    }
  }, [campaignId]);

  useEffect(() => {
    // Campaign switched -- drop everything scoped to the old one before
    // loading the new one's data, so a stale row from campaign A can't
    // flash while campaign B is loading.
    setOverview(null);
    setTemplates([]);
    setTemplateId("");
    setSendStep(1);
    setView("all");
    didPickInitialView.current = false;
    setSelected(new Set());
    setExpandedId(null);
    setHistoryById({});
    setReviewOpen(false);
    setImportTarget("new");
    setMoveTarget("");
    setEditingTiming(false);
    setMessage(null);

    refresh();
    loadTemplates();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [campaignId, refresh, loadTemplates]);

  // Choosing which email to send picks the template tagged for that step (if any).
  useEffect(() => {
    const tagged = templates.find((t) => t.sequenceStep === sendStep);
    if (tagged) setTemplateId(tagged.id);
  }, [sendStep, templates]);

  const batches = useMemo(() => overview?.batches ?? [], [overview]);
  const realBatches = useMemo(() => batches.filter((b) => b.id !== null), [batches]);
  const visibleBatches = useMemo(
    () => (view === "all" ? batches : batches.filter((b) => viewOf(b) === view)),
    [batches, view]
  );
  const allContacts = useMemo(() => batches.flatMap((b) => b.contacts), [batches]);
  const visibleContacts = useMemo(() => visibleBatches.flatMap((b) => b.contacts), [visibleBatches]);

  const selectedContacts = useMemo(() => allContacts.filter((c) => selected.has(c.id)), [allContacts, selected]);
  const canSend = (c: Contact) => {
    const state = c.sequence.steps[sendStep - 1]?.state;
    return state === "due" || state === "scheduled";
  };
  const sendable = selectedContacts.filter(canSend);
  const skippedCount = selectedContacts.length - sendable.length;
  const readyInView = visibleContacts.filter((c) => c.sequence.steps[sendStep - 1]?.state === "due");

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const previewContact = sendable[0];
  const previewHtml = useMemo(
    () =>
      previewMerge(
        draftHtml,
        previewContact
          ? { firstName: previewContact.firstName, lastName: previewContact.lastName, company: previewContact.company }
          : undefined
      ),
    [draftHtml, previewContact]
  );

  function changeView(next: View) {
    setView(next);
    setSelected(new Set());
    setExpandedId(null);
    setReviewOpen(false);
    setMessage(null);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(contacts: Contact[]) {
    setSelected((prev) => {
      const allOn = contacts.length > 0 && contacts.every((c) => prev.has(c.id));
      const next = new Set(prev);
      for (const c of contacts) {
        if (allOn) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  }

  function selectAllReady() {
    setSelected(new Set(readyInView.map((c) => c.id)));
  }

  async function postJson(path: string, body: unknown) {
    const res = await fetch(withBasePath(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { res, data };
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("campaignId", String(campaignId));
    form.append("batchId", importTarget);
    if (importTarget === "new") form.append("newBatchName", newBatchName);
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/outreach/import"), { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!data) {
        setMessage(`Import failed: server returned an unexpected response (status ${res.status}).`);
      } else if (!res.ok || !data.ok) {
        setMessage(`Import failed: ${data.error ?? `HTTP ${res.status}`}`);
      } else {
        const batchName: string | null =
          data.batch?.name ?? (importTarget !== "new" ? realBatches.find((b) => String(b.id) === importTarget)?.name ?? null : null);
        setMessage(
          `Imported${batchName ? ` into "${batchName}"` : ""}: ${data.created} added, ${data.updated} already in this campaign${
            data.inOtherBatch ? ` (${data.inOtherBatch} left in their current batch)` : ""
          }${data.skipped?.length ? `, ${data.skipped.length} skipped` : ""}.`
        );
        setNewBatchName("");
        await refresh();
        if (data.batch?.id) {
          // Keep importing into the batch just created unless the person picks another.
          setImportTarget(String(data.batch.id));
          setView(data.batch.id);
        } else if (importTarget !== "new") {
          setView(Number(importTarget));
        }
        setSelected(new Set());
      }
    } catch (err) {
      setMessage(`Import failed: ${err instanceof Error ? err.message : "network error"}.`);
    } finally {
      e.target.value = "";
    }
  }

  async function handleCreateBatch() {
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await postJson("/api/outreach/batches", { campaignId, name: newBatchInput });
      if (!data?.ok) {
        setMessage(`Couldn't create batch: ${data?.error ?? "unexpected response"}`);
        return;
      }
      setNewBatchInput("");
      setCreatingBatch(false);
      await refresh();
      changeView(data.batch.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleRenameBatch(batch: BatchOverview) {
    if (batch.id === null) return;
    const name = window.prompt("Rename batch", batch.name);
    if (name === null || !name.trim() || name.trim() === batch.name) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(withBasePath(`/api/outreach/batches/${batch.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) setMessage(`Rename failed: ${data?.error ?? `HTTP ${res.status}`}`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBatch(batch: BatchOverview) {
    if (batch.id === null) return;
    const n = batch.contacts.length;
    const ok = window.confirm(
      n > 0
        ? `Delete the batch "${batch.name}"? Its ${n} contact${n === 1 ? "" : "s"} stay in the campaign as Unassigned, with their email history, so you can move them into another batch.`
        : `Delete the empty batch "${batch.name}"?`
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(withBasePath(`/api/outreach/batches/${batch.id}`), { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!data?.ok) setMessage(`Delete failed: ${data?.error ?? `HTTP ${res.status}`}`);
      else changeView("all");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleMove() {
    if (selected.size === 0 || !moveTarget) return;
    setBusy(true);
    setMessage(null);
    try {
      let targetId: number | null;
      let targetName: string;
      if (moveTarget === "unassigned") {
        targetId = null;
        targetName = "Unassigned";
      } else if (moveTarget === "new") {
        const created = await postJson("/api/outreach/batches", { campaignId, name: moveNewName });
        if (!created.data?.ok) {
          setMessage(`Couldn't create batch: ${created.data?.error ?? "unexpected response"}`);
          return;
        }
        targetId = created.data.batch.id;
        targetName = created.data.batch.name;
      } else {
        targetId = Number(moveTarget);
        targetName = realBatches.find((b) => b.id === targetId)?.name ?? "the batch";
      }

      const { data } = await postJson("/api/outreach/prospects/move", {
        campaignId,
        prospectIds: Array.from(selected),
        batchId: targetId,
      });
      if (!data?.ok) {
        setMessage(`Move failed: ${data?.error ?? "unexpected response"}`);
        return;
      }
      setMessage(`Moved ${data.count} contact${data.count === 1 ? "" : "s"} to "${targetName}" — their email history moved with them.`);
      setSelected(new Set());
      setMoveTarget("");
      setMoveNewName("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (selected.size === 0) return;
    const n = selected.size;
    const ok = window.confirm(
      `Remove ${n} contact${n === 1 ? "" : "s"} from this campaign?\n\nTheir email history and tracking are deleted too. You can import them again later and they'll start fresh from Email 1.`
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await postJson("/api/outreach/prospects/remove", {
        campaignId,
        prospectIds: Array.from(selected),
      });
      if (!data?.ok) {
        setMessage(`Remove failed: ${data?.error ?? "unexpected response"}`);
        return;
      }
      setMessage(`Removed ${data.count} contact${data.count === 1 ? "" : "s"}.`);
      setSelected(new Set());
      setExpandedId(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function openReview() {
    if (!selectedTemplate || sendable.length === 0) return;
    setDraftSubject(selectedTemplate.subject);
    setDraftHtml(selectedTemplate.html);
    setMessage(null);
    setReviewOpen(true);
  }

  async function handleConfirmSend() {
    if (sendable.length === 0 || templateId === "") return;
    setSending(true);
    setMessage(null);
    try {
      const { data } = await postJson("/api/outreach/send", {
        campaignId,
        prospectIds: sendable.map((c) => c.id),
        templateId,
        step: sendStep,
        subject: draftSubject,
        html: draftHtml,
      });
      if (data?.ok) {
        const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
        const reasons = Array.from(new Set(failed.map((r: { error?: string }) => r.error).filter(Boolean)));
        setMessage(
          failed.length
            ? `Email ${sendStep}: queued ${data.results.length - failed.length}, ${failed.length} not sent${
                reasons.length ? ` (${reasons.join("; ")})` : ""
              }.`
            : `Email ${sendStep}: queued ${data.results.length} send request(s) — each moves to "Sent" once confirmed.`
        );
        setSelected(new Set());
        setReviewOpen(false);
        refresh();
      } else {
        setMessage(`Send failed: ${data?.error ?? "unexpected response"}`);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleReset(prospectId: number) {
    setResettingIds((prev) => new Set(prev).add(prospectId));
    setMessage(null);
    try {
      const { data } = await postJson("/api/outreach/reset", { prospectIds: [prospectId] });
      if (data?.ok) {
        refresh();
      } else {
        setMessage(`Reset failed: ${data?.error ?? "unexpected response"}`);
      }
    } finally {
      setResettingIds((prev) => {
        const next = new Set(prev);
        next.delete(prospectId);
        return next;
      });
    }
  }

  async function handleSaveTiming() {
    if (!overview) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(withBasePath(`/api/outreach/campaigns/${campaignId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: overview.campaign.name,
          description: overview.campaign.description ?? undefined,
          email2DelayDays: timing.e2,
          email3DelayDays: timing.e3,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        setMessage(`Couldn't save timing: ${data?.error ?? `HTTP ${res.status}`}`);
        return;
      }
      setEditingTiming(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function reportHref(batchId?: number | "unassigned") {
    const params = new URLSearchParams({ campaignId: String(campaignId), tz: browserTimeZone() });
    if (batchId !== undefined) params.set("batchId", String(batchId));
    return withBasePath(`/api/outreach/report?${params.toString()}`);
  }

  const columnCount = 9;
  const hasContacts = allContacts.length > 0;

  return (
    <div className="space-y-4">
      {/* Batch picker */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => changeView("all")}
          className={clsx(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition",
            view === "all"
              ? "border-button-primary bg-button-primary text-button-primary-foreground"
              : "border-border/60 text-foreground/70 hover:bg-muted/60"
          )}
        >
          All batches
          <span className={clsx("ml-1.5 text-xs", view === "all" ? "opacity-80" : "text-foreground/40")}>
            {allContacts.length}
          </span>
        </button>
        {batches.map((b) => (
          <button
            key={String(b.id)}
            type="button"
            onClick={() => changeView(viewOf(b))}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              view === viewOf(b)
                ? "border-button-primary bg-button-primary text-button-primary-foreground"
                : "border-border/60 text-foreground/70 hover:bg-muted/60",
              b.id === null && "italic"
            )}
          >
            {b.name}
            <span className={clsx("ml-1.5 text-xs", view === viewOf(b) ? "opacity-80" : "text-foreground/40")}>
              {b.contacts.length}
            </span>
          </button>
        ))}
        {creatingBatch ? (
          <span className="inline-flex items-center gap-2">
            <input
              type="text"
              value={newBatchInput}
              onChange={(e) => setNewBatchInput(e.target.value)}
              placeholder={`Batch ${realBatches.length + 1}`}
              className="w-40 rounded-lg border border-border/60 px-3 py-1.5 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateBatch();
                if (e.key === "Escape") setCreatingBatch(false);
              }}
            />
            <Button size="sm" onClick={handleCreateBatch} disabled={busy}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreatingBatch(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setCreatingBatch(true)}>
            <Plus className="h-4 w-4" /> New batch
          </Button>
        )}
      </div>

      {/* Sequence timing */}
      {overview ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
          {editingTiming ? (
            <>
              <span>Email 2 due</span>
              <input
                type="number"
                min={0}
                max={60}
                value={timing.e2}
                onChange={(e) => setTiming((t) => ({ ...t, e2: Number(e.target.value) }))}
                className="w-14 rounded border border-border/60 px-2 py-1"
              />
              <span>days after Email 1; Email 3 due</span>
              <input
                type="number"
                min={0}
                max={60}
                value={timing.e3}
                onChange={(e) => setTiming((t) => ({ ...t, e3: Number(e.target.value) }))}
                className="w-14 rounded border border-border/60 px-2 py-1"
              />
              <span>days after Email 2.</span>
              <Button size="sm" onClick={handleSaveTiming} disabled={busy}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTiming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <span>
                Suggested timing: Email 2 is due {overview.campaign.email2DelayDays} day
                {overview.campaign.email2DelayDays === 1 ? "" : "s"} after Email 1, Email 3 {overview.campaign.email3DelayDays} day
                {overview.campaign.email3DelayDays === 1 ? "" : "s"} after Email 2. Nothing sends automatically.
              </span>
              <button
                type="button"
                onClick={() => {
                  setTiming({ e2: overview.campaign.email2DelayDays, e3: overview.campaign.email3DelayDays });
                  setEditingTiming(true);
                }}
                className="underline decoration-dotted hover:text-foreground"
              >
                Change
              </button>
            </>
          )}
        </div>
      ) : null}

      {/* Import + send controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
          <span className="text-xs font-medium text-foreground/70">Import CSV into</span>
          <select
            value={importTarget}
            onChange={(e) => setImportTarget(e.target.value)}
            className="rounded-lg border border-border/60 px-2 py-1 text-sm"
          >
            <option value="new">a new batch</option>
            {realBatches.map((b) => (
              <option key={String(b.id)} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
          {importTarget === "new" ? (
            <input
              type="text"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              placeholder={`Batch ${realBatches.length + 1} (name optional)`}
              className="w-44 rounded-lg border border-border/60 px-2 py-1 text-sm"
            />
          ) : null}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-sm font-medium hover:bg-muted/60">
            <Upload className="h-4 w-4" />
            Upload CSV
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        <span className="text-xs text-foreground/60">Columns: email, first_name (required), last_name, company, title</span>
        <div className="flex-1" />
        <label className="text-xs font-medium text-foreground/70">Send</label>
        <select
          value={sendStep}
          onChange={(e) => setSendStep(Number(e.target.value) as SendStep)}
          disabled={reviewOpen}
          className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          <option value={1}>Email 1</option>
          <option value={2}>Email 2</option>
          <option value={3}>Email 3</option>
        </select>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(Number(e.target.value))}
          disabled={reviewOpen || templates.length === 0}
          className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium disabled:opacity-50"
          title="Template to send. Tag a template as Email 1/2/3 on the Templates tab and it's picked automatically."
        >
          {templates.length === 0 ? <option value="">No templates yet</option> : null}
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.sequenceStep ? ` (Email ${t.sequenceStep})` : ""}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="md" onClick={selectAllReady} disabled={readyInView.length === 0}>
          Select all ready for Email {sendStep} ({readyInView.length})
        </Button>
        <Button size="md" onClick={openReview} disabled={sendable.length === 0 || !selectedTemplate || reviewOpen}>
          Review & send Email {sendStep} to {sendable.length || ""}
        </Button>
      </div>

      {/* Selection actions */}
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          {skippedCount > 0 ? (
            <span className="text-xs text-foreground/60">
              {skippedCount} can&apos;t receive Email {sendStep} right now (already sent, waiting on an earlier email, or stopped) — skipped when sending.
            </span>
          ) : null}
          <div className="flex-1" />
          <select
            value={moveTarget}
            onChange={(e) => setMoveTarget(e.target.value)}
            className="rounded-lg border border-border/60 px-2 py-1.5 text-sm"
          >
            <option value="">Move to…</option>
            {realBatches.map((b) => (
              <option key={String(b.id)} value={String(b.id)}>
                {b.name}
              </option>
            ))}
            <option value="unassigned">Unassigned</option>
            <option value="new">A new batch…</option>
          </select>
          {moveTarget === "new" ? (
            <input
              type="text"
              value={moveNewName}
              onChange={(e) => setMoveNewName(e.target.value)}
              placeholder={`Batch ${realBatches.length + 1} (name optional)`}
              className="w-44 rounded-lg border border-border/60 px-2 py-1.5 text-sm"
            />
          ) : null}
          <Button size="sm" variant="secondary" onClick={handleMove} disabled={!moveTarget || busy}>
            Move
          </Button>
          <Button size="sm" variant="secondary" onClick={handleRemove} disabled={busy}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}

      {reviewOpen && selectedTemplate ? (
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Review & edit Email {sendStep} before sending to {sendable.length}
            </h3>
            <span className="text-xs text-foreground/60">Template: {selectedTemplate.name}</span>
          </div>
          <p className="text-xs text-foreground/60">{PLACEHOLDER_HINT}</p>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground/70">Subject</label>
            <input
              type="text"
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">HTML body</label>
              <textarea
                value={draftHtml}
                onChange={(e) => setDraftHtml(e.target.value)}
                rows={16}
                spellCheck={false}
                className="w-full rounded-lg border border-border/60 p-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground/70">
                Preview ({previewContact ? previewContact.firstName : "sample data"})
              </label>
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="h-[420px] w-full rounded-lg border border-border/60 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button size="md" onClick={handleConfirmSend} disabled={sending || sendable.length === 0}>
              {sending ? "Sending…" : `Send Email ${sendStep} to ${sendable.length}`}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-foreground/60">
            <tr>
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Email 1</th>
              <th className="px-3 py-2">Email 2</th>
              <th className="px-3 py-2">Email 3</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleBatches.map((b) => {
              const s = b.summary;
              const groupAllOn = b.contacts.length > 0 && b.contacts.every((c) => selected.has(c.id));
              return (
                <Fragment key={String(b.id)}>
                  <tr className="border-t border-border/60 bg-muted/30">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={groupAllOn}
                        onChange={() => toggleGroup(b.contacts)}
                        disabled={b.contacts.length === 0}
                        aria-label={`Select all in ${b.name}`}
                      />
                    </td>
                    <td colSpan={columnCount - 1} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className={clsx("text-sm font-semibold", b.id === null && "italic")}>{b.name}</span>
                        <span className="text-xs text-foreground/60">
                          {s.total} contact{s.total === 1 ? "" : "s"} · Email 1 sent {s.sentByStep[0]} · Email 2 sent {s.sentByStep[1]}
                          {s.dueByStep[1] > 0 ? ` (${s.dueByStep[1]} ready)` : ""} · Email 3 sent {s.sentByStep[2]}
                          {s.dueByStep[2] > 0 ? ` (${s.dueByStep[2]} ready)` : ""} · Opened {s.opened} · Replied {s.replied} · Bounced{" "}
                          {s.bounced}
                        </span>
                        <span className="flex-1" />
                        {b.contacts.length > 0 ? (
                          <a
                            href={reportHref(b.id === null ? "unassigned" : b.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground"
                            title="Download this batch as a CSV"
                          >
                            <Download className="h-3.5 w-3.5" /> CSV
                          </a>
                        ) : null}
                        {b.id !== null ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRenameBatch(b)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground disabled:opacity-50"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBatch(b)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete batch
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {b.contacts.map((p) => (
                    <Fragment key={p.id}>
                      <tr className="border-t border-border/40">
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                        </td>
                        <td className="px-3 py-2">
                          {contactName(p)}
                          {p.title ? <div className="text-xs text-foreground/50">{p.title}</div> : null}
                        </td>
                        <td className="px-3 py-2">{p.email}</td>
                        <td className="px-3 py-2">{p.company ?? "—"}</td>
                        {p.sequence.steps.map((info) => (
                          <td key={info.step} className="px-3 py-2">
                            <StepCell info={info} />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[p.status])}>
                            {p.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleHistory(p.id)}
                            className="text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground"
                          >
                            {expandedId === p.id ? "Hide history" : "History"}
                          </button>
                          {p.status !== "PENDING" ? (
                            <button
                              type="button"
                              onClick={() => handleReset(p.id)}
                              disabled={resettingIds.has(p.id)}
                              title="Reset the status to Pending — use it if a send got stuck or failed, or to resume the sequence after a reply or bounce was logged by mistake. Email history is kept."
                              className="ml-3 text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground disabled:opacity-50"
                            >
                              {resettingIds.has(p.id) ? "Resetting…" : "Reset to Pending"}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                      {expandedId === p.id ? (
                        <tr className="border-t border-border/40 bg-muted/20">
                          <td colSpan={columnCount} className="px-3 py-3">
                            <HistoryTimeline state={historyById[p.id]} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                  {b.contacts.length === 0 ? (
                    <tr className="border-t border-border/40">
                      <td colSpan={columnCount} className="px-3 py-4 text-center text-xs text-foreground/50">
                        This batch is empty — import a CSV into it, or move contacts here from another batch.
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!loading && !hasContacts && batches.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-3 py-6 text-center text-foreground/50">
                  No contacts yet — upload a CSV above. It will be placed in a new batch.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
