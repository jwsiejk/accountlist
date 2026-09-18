"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

interface Prospect {
  id: number;
  email: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  title: string | null;
  status: "PENDING" | "SENT" | "OPENED" | "CLICKED" | "REPLIED" | "BOUNCED";
  lastSentAt: string | null;
}

const STATUS_STYLES: Record<Prospect["status"], string> = {
  PENDING: "bg-muted text-foreground/60",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  OPENED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  CLICKED: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  REPLIED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  BOUNCED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function SC26OutreachDashboard() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sc26-outreach/prospects", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setProspects(data.prospects);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Light polling so opens/clicks/replies show up without a manual refresh.
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setMessage(null);
    const res = await fetch("/api/sc26-outreach/import", { method: "POST", body: form });
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

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sc26-outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.ok) {
        const failed = data.results.filter((r: { ok: boolean }) => !r.ok);
        setMessage(
          failed.length
            ? `Sent ${data.results.length - failed.length}, ${failed.length} failed.`
            : `Sent to ${data.results.length} prospect(s).`
        );
        setSelected(new Set());
        refresh();
      } else {
        setMessage(`Send failed: ${data.error}`);
      }
    } finally {
      setSending(false);
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
        <button
          type="button"
          onClick={toggleAllPending}
          className="rounded-lg border border-border/60 px-3 py-2 text-sm font-medium hover:bg-muted/60"
        >
          Select all pending
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={selected.size === 0 || sending}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {sending ? "Sending…" : `Send to ${selected.size || ""} selected`}
        </button>
      </div>

      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}

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
              </tr>
            ))}
            {!loading && prospects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-foreground/50">
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
