"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";

import { withBasePath } from "@/lib/basePath";

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

interface OutreachTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  html: string;
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

// Kept as a plain string rather than inline in JSX -- literal double curly
// braces in JSX text get parsed as an expression, so this would otherwise
// need an awkward {"{{FIRST_NAME}}"} escape at every occurrence.
const PLACEHOLDER_HINT =
  "Placeholders: {{FIRST_NAME}}, {{LAST_NAME}}, {{COMPANY}}, {{SENDER_NAME}}, {{TRACKING_PIXEL}}, {{BOOKING_LINK}}. " +
  "Keep {{TRACKING_PIXEL}} and {{BOOKING_LINK}} somewhere in the HTML, or opens/clicks for this send won't be tracked.";

/**
 * Client-side preview merge only -- cosmetic, so the reviewer can see
 * roughly what the email will look like before sending. The real,
 * authoritative merge (with real tracking URLs, HTML-escaped fields, and
 * the plain-text-safe subject variant) happens server-side per recipient
 * in send/route.ts -- see lib/sc26-outreach/merge.ts.
 */
function previewMerge(source: string, prospect: Prospect | undefined): string {
  const fields: Record<string, string> = {
    FIRST_NAME: prospect?.firstName || "Jordan",
    LAST_NAME: prospect?.lastName || "Prospect",
    COMPANY: prospect?.company || "Example Corp",
    // Cosmetic only -- the real SENDER_NAME merge value comes from the
    // server-side SC26_SENDER_NAME env var at send time (send/route.ts),
    // which isn't exposed to the client.
    SENDER_NAME: "DDN",
    TRACKING_PIXEL: "",
    BOOKING_LINK: '<a href="#">book a meeting with DDN here</a>',
  };
  return source.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (match, key: string) =>
    key in fields ? fields[key] : match
  );
}

export function SC26OutreachDashboard() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resettingIds, setResettingIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftHtml, setDraftHtml] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(withBasePath("/api/sc26-outreach/prospects"), { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setProspects(data.prospects);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch(withBasePath("/api/sc26-outreach/templates"), { cache: "no-store" });
    const data = await res.json();
    if (data.ok) {
      setTemplates(data.templates);
      // Only default it the first time templates load -- don't clobber a
      // choice already made if this ever re-runs.
      setTemplateId((prev) => prev || data.templates[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    refresh();
    loadTemplates();
    // Light polling so opens/clicks/replies show up without a manual refresh.
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh, loadTemplates]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setMessage(null);
    const res = await fetch(withBasePath("/api/sc26-outreach/import"), { method: "POST", body: form });
    const data = await res.json();
    if (data.ok) {
      setMessage(
        `Imported: ${data.created} added, ${data.updated} updated${
          data.skipped?.length ? `, ${data.skipped.length} skipped` : ""
        }.`
      );
      refresh();
    } else {
      setMessage(`Import failed: ${data.error}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
  // Used purely to render a representative preview -- the actual send
  // merges each selected prospect's own data server-side.
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
    if (selected.size === 0) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/sc26-outreach/send"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  /**
   * Unsticks a prospect that's stuck at SENDING (or any other non-PENDING
   * status) after a failed or misconfigured send attempt -- e.g. a bounced
   * relay/trigger email means the flow never actually reached them, so
   * there's no real progress to lose by resetting. Before this existed,
   * the only fix was editing the database directly. Single-prospect rather
   * than bulk: this is meant as an occasional manual escape hatch, not a
   * routine bulk action, so keeping it a per-row control avoids it being
   * mistaken for (or misused as) a way to bulk-retry real sends.
   */
  async function handleReset(prospectId: number) {
    setResettingIds((prev) => new Set(prev).add(prospectId));
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/sc26-outreach/reset"), {
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
        <label className="cursor-pointer rounded-lg border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/60">
          Upload CSV
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
        <span className="text-xs text-foreground/60">
          Columns: email, first_name (required), last_name, company, title
        </span>
        <div className="flex-1" />
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          disabled={reviewOpen || templates.length === 0}
          className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {templates.length === 0 ? <option value="">Loading templates…</option> : null}
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={toggleAllPending}
          className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/60"
        >
          Select all pending
        </button>
        <button
          type="button"
          onClick={openReview}
          disabled={selected.size === 0 || !selectedTemplate || reviewOpen}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Review & send to {selected.size || ""} selected
        </button>
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
            <button
              type="button"
              onClick={() => setReviewOpen(false)}
              className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSend}
              disabled={sending || selected.size === 0}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {sending ? "Sending…" : `Send to ${selected.size} selected`}
            </button>
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
              <tr key={p.id} className="border-t border-border/40">
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
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLES[p.status]
                    )}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-foreground/60">
                  {p.lastSentAt ? new Date(p.lastSentAt).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2">
                  {p.status !== "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => handleReset(p.id)}
                      disabled={resettingIds.has(p.id)}
                      title="Reset to Pending so this can be sent again -- use if a send got stuck or failed."
                      className="text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground disabled:opacity-50"
                    >
                      {resettingIds.has(p.id) ? "Resetting…" : "Reset to Pending"}
                    </button>
                  ) : null}
                </td>
              </tr>
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
