"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { clsx } from "clsx";
import { Upload } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import { Button } from "@/components/ui/button";
import { previewMerge, PLACEHOLDER_HINT } from "./mergePreview";
import { HistoryTimeline, type HistoryState } from "./HistoryTimeline";
import type { Template } from "./TemplatesPanel";

interface Prospect {
  id: number;
  email: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  title: string | null;
  status: "PENDING" | "SENDING" | "SENT" | "OPENED" | "CLICKED" | "REPLIED" | "BOUNCED";
  lastSentAt: string | null;
}

const STATUS_STYLES: Record<Prospect["status"], string> = {
  PENDING: "bg-muted text-foreground/60",
  SENDING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  OPENED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  CLICKED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  REPLIED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  BOUNCED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function ProspectsPanel({ campaignId }: { campaignId: number }) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resettingIds, setResettingIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyById, setHistoryById] = useState<Record<number, HistoryState>>({});

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

  const [reviewOpen, setReviewOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftHtml, setDraftHtml] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath(`/api/outreach/prospects?campaignId=${campaignId}`), {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) setProspects(data.prospects);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadTemplates = useCallback(async () => {
    const res = await fetch(withBasePath(`/api/outreach/templates?campaignId=${campaignId}`), {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.ok) {
      setTemplates(data.templates);
      setTemplateId((prev) => prev || data.templates[0]?.id || "");
    }
  }, [campaignId]);

  useEffect(() => {
    // Campaign switched -- drop everything scoped to the old one before
    // loading the new one's data, so a stale row from campaign A can't
    // flash while campaign B is loading.
    setProspects([]);
    setTemplates([]);
    setTemplateId("");
    setSelected(new Set());
    setExpandedId(null);
    setHistoryById({});
    setReviewOpen(false);

    refresh();
    loadTemplates();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [campaignId, refresh, loadTemplates]);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("campaignId", String(campaignId));
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/outreach/import"), { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!data) {
        setMessage(`Import failed: server returned an unexpected response (status ${res.status}).`);
      } else if (!res.ok || !data.ok) {
        setMessage(`Import failed: ${data.error ?? `HTTP ${res.status}`}`);
      } else {
        setMessage(
          `Imported: ${data.created} added, ${data.updated} updated${
            data.skipped?.length ? `, ${data.skipped.length} skipped` : ""
          }.`
        );
        refresh();
      }
    } catch (err) {
      setMessage(`Import failed: ${err instanceof Error ? err.message : "network error"}.`);
    } finally {
      e.target.value = "";
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPending() {
    const pendingIds = prospects.filter((p) => p.status === "PENDING").map((p) => p.id);
    setSelected((prev) => (prev.size === pendingIds.length ? new Set() : new Set(pendingIds)));
  }

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const previewProspect = prospects.find((p) => selected.has(p.id));

  function openReview() {
    if (!selectedTemplate || selected.size === 0) return;
    setDraftSubject(selectedTemplate.subject);
    setDraftHtml(selectedTemplate.html);
    setMessage(null);
    setReviewOpen(true);
  }

  const previewHtml = useMemo(() => previewMerge(draftHtml, previewProspect), [draftHtml, previewProspect]);

  async function handleConfirmSend() {
    if (selected.size === 0 || templateId === "") return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/outreach/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          prospectIds: Array.from(selected),
          templateId,
          subject: draftSubject,
          html: draftHtml,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
        setMessage(
          failed.length
            ? `Queued ${data.results.length - failed.length}, ${failed.length} failed to queue.`
            : `Queued ${data.results.length} send request(s) — status will move to Sent once confirmed.`
        );
        setSelected(new Set());
        setReviewOpen(false);
        refresh();
      } else {
        setMessage(`Send failed: ${data.error}`);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleReset(prospectId: number) {
    setResettingIds((prev) => new Set(prev).add(prospectId));
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/outreach/reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds: [prospectId] }),
      });
      const data = await res.json();
      if (data.ok) {
        refresh();
      } else {
        setMessage(`Reset failed: ${data.error}`);
      }
    } finally {
      setResettingIds((prev) => {
        const next = new Set(prev);
        next.delete(prospectId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/60">
          <Upload className="h-4 w-4" />
          Upload CSV
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
        </label>
        <span className="text-xs text-foreground/60">
          Columns: email, first_name (required), last_name, company, title
        </span>
        <div className="flex-1" />
        <select
          value={templateId}
          onChange={(e) => setTemplateId(Number(e.target.value))}
          disabled={reviewOpen || templates.length === 0}
          className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {templates.length === 0 ? <option value="">No templates yet</option> : null}
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="md" onClick={toggleAllPending}>
          Select all pending
        </Button>
        <Button size="md" onClick={openReview} disabled={selected.size === 0 || !selectedTemplate || reviewOpen}>
          Review & send to {selected.size || ""} selected
        </Button>
      </div>

      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}

      {reviewOpen && selectedTemplate ? (
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Review & edit before sending</h3>
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
                Preview ({previewProspect ? previewProspect.firstName : "sample data"})
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
            <Button size="md" onClick={handleConfirmSend} disabled={sending || selected.size === 0}>
              {sending ? "Sending…" : `Send to ${selected.size} selected`}
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
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last sent</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <Fragment key={p.id}>
                <tr className="border-t border-border/40">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      disabled={p.status !== "PENDING"}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {p.firstName} {p.lastName ?? ""}
                    {p.title ? <div className="text-xs text-foreground/50">{p.title}</div> : null}
                  </td>
                  <td className="px-3 py-2">{p.email}</td>
                  <td className="px-3 py-2">{p.company ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[p.status])}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground/60">
                    {p.lastSentAt ? new Date(p.lastSentAt).toLocaleString() : "—"}
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
                        title="Reset to Pending so this can be sent again -- use if a send got stuck or failed."
                        className="ml-3 text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground disabled:opacity-50"
                      >
                        {resettingIds.has(p.id) ? "Resetting…" : "Reset to Pending"}
                      </button>
                    ) : null}
                  </td>
                </tr>
                {expandedId === p.id ? (
                  <tr className="border-t border-border/40 bg-muted/20">
                    <td colSpan={7} className="px-3 py-3">
                      <HistoryTimeline state={historyById[p.id]} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {!loading && prospects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-foreground/50">
                  No prospects yet — upload a CSV to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
