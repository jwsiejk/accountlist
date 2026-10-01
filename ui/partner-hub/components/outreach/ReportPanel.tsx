"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardCopy, Download, RefreshCw } from "lucide-react";

import { withBasePath } from "@/lib/basePath";
import { Button } from "@/components/ui/button";
import { browserTimeZone, contactName, type BatchOverview, type BatchSummary, type Contact, type Overview } from "./types";

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function nextLabel(c: Contact): string {
  const next = c.sequence.nextStep ? c.sequence.steps[c.sequence.nextStep - 1] : null;
  if (next) {
    return next.state === "due"
      ? `Email ${next.step} ready`
      : `Email ${next.step} due ${next.dueAt ? new Date(next.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}`;
  }
  switch (c.sequence.status) {
    case "complete":
      return "Sequence complete";
    case "replied":
      return "Replied — stopped";
    case "bounced":
      return "Bounced — stopped";
    default:
      return c.sequence.steps.some((s) => s.state === "queued") ? "Awaiting send confirmation" : "—";
  }
}

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-foreground/60">{label}</div>
      {sub ? <div className="text-[11px] text-foreground/40">{sub}</div> : null}
    </div>
  );
}

function pct(part: number, whole: number): string | undefined {
  return whole > 0 ? `${Math.round((part / whole) * 100)}% of contacts` : undefined;
}

function SummaryTiles({ s }: { s: BatchSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      <Tile label="Contacts" value={s.total} />
      <Tile label="Email 1 sent" value={s.sentByStep[0]} sub={pct(s.sentByStep[0], s.total)} />
      <Tile label="Email 2 sent" value={s.sentByStep[1]} sub={pct(s.sentByStep[1], s.total)} />
      <Tile label="Email 3 sent" value={s.sentByStep[2]} sub={pct(s.sentByStep[2], s.total)} />
      <Tile label="Opened" value={s.opened} sub={pct(s.opened, s.total)} />
      <Tile label="Clicked" value={s.clicked} sub={pct(s.clicked, s.total)} />
      <Tile label="Replied" value={s.replied} sub={pct(s.replied, s.total)} />
      <Tile label="Bounced" value={s.bounced} sub={pct(s.bounced, s.total)} />
    </div>
  );
}

function BatchSection({ batch, reportHref }: { batch: BatchOverview; reportHref: string }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-base font-semibold">{batch.name}</h3>
        <span className="text-xs text-foreground/60">
          {batch.contacts.length} contact{batch.contacts.length === 1 ? "" : "s"}
        </span>
        <div className="flex-1" />
        {batch.contacts.length > 0 ? (
          <a
            href={reportHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Download this batch (CSV)
          </a>
        ) : null}
      </div>
      <SummaryTiles s={batch.summary} />
      {batch.contacts.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-foreground/60">
              <tr>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Email 1 sent</th>
                <th className="px-3 py-2">Email 2 sent</th>
                <th className="px-3 py-2">Email 3 sent</th>
                <th className="px-3 py-2">Opened</th>
                <th className="px-3 py-2">Clicked</th>
                <th className="px-3 py-2">Replied</th>
                <th className="px-3 py-2">Next</th>
              </tr>
            </thead>
            <tbody>
              {batch.contacts.map((c) => (
                <tr key={c.id} className="border-t border-border/40">
                  <td className="px-3 py-2">
                    {contactName(c)}
                    <div className="text-xs text-foreground/50">{c.email}</div>
                  </td>
                  <td className="px-3 py-2">{c.company ?? "—"}</td>
                  {c.sequence.steps.map((s) => (
                    <td key={s.step} className="whitespace-nowrap px-3 py-2 text-xs">
                      {s.state === "sent" ? when(s.sentAt) : s.state === "queued" ? "Queued…" : "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2">{c.engagement.opened ? <Check className="h-4 w-4 text-amber-600" aria-label="Opened" /> : "—"}</td>
                  <td className="px-3 py-2">{c.engagement.clicked ? <Check className="h-4 w-4 text-purple-600" aria-label="Clicked" /> : "—"}</td>
                  <td className="px-3 py-2">
                    {c.engagement.replied || c.status === "REPLIED" ? (
                      <Check className="h-4 w-4 text-green-600" aria-label="Replied" />
                    ) : c.status === "BOUNCED" ? (
                      <span className="text-xs font-medium text-red-600">Bounced</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-foreground/70">{nextLabel(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-foreground/50">No contacts in this batch.</p>
      )}
    </section>
  );
}

/**
 * Report tab: the campaign as a whole, then each batch with its contacts,
 * when each email went out and how they engaged -- the view to share with
 * account reps. "Download CSV" and "Copy summary" produce the same report
 * as a spreadsheet or as text to paste into an email.
 */
export function ReportPanel({ campaignId }: { campaignId: number }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBasePath(`/api/outreach/overview?campaignId=${campaignId}`), { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        setError(data?.error ?? `HTTP ${res.status}`);
        return;
      }
      setOverview(data as Overview);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    setOverview(null);
    refresh();
  }, [refresh]);

  function href(batchId?: number | "unassigned", format?: "text") {
    const params = new URLSearchParams({ campaignId: String(campaignId), tz: browserTimeZone() });
    if (batchId !== undefined) params.set("batchId", String(batchId));
    if (format) params.set("format", format);
    return withBasePath(`/api/outreach/report?${params.toString()}`);
  }

  async function copySummary() {
    setError(null);
    try {
      const res = await fetch(href(undefined, "text"), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await navigator.clipboard.writeText(await res.text());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setError(`Couldn't copy the summary: ${err instanceof Error ? err.message : "clipboard unavailable"}`);
    }
  }

  if (!overview) {
    return <p className="text-sm text-foreground/60">{error ? `Couldn't load the report: ${error}` : "Loading report…"}</p>;
  }

  const batches = overview.batches.filter((b) => b.contacts.length > 0 || b.id !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="text-base font-semibold">{overview.campaign.name} — report</h3>
          <p className="text-xs text-foreground/60">
            Opens and clicks exclude suspected automated link-scanners. Updated {new Date().toLocaleString()}.
          </p>
        </div>
        <div className="flex-1" />
        <Button size="sm" variant="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
        <Button size="sm" variant="secondary" onClick={copySummary}>
          {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy summary"}
        </Button>
        <a
          href={href()}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-muted/80 px-3 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Download CSV
        </a>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Whole campaign</h4>
        <SummaryTiles s={overview.summary} />
      </div>

      {batches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-foreground/60">
          Nothing to report yet — import contacts into a batch on the Batches tab.
        </div>
      ) : (
        batches.map((b) => (
          <BatchSection key={String(b.id)} batch={b} reportHref={href(b.id === null ? "unassigned" : b.id)} />
        ))
      )}
    </div>
  );
}
