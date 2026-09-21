"use client";

import type { ReactNode } from "react";
import { Bot, CheckCircle2, Eye, Mail, MousePointerClick, Reply, XCircle } from "lucide-react";
import { clsx } from "clsx";

export interface TrackingEventRow {
  id: number;
  type: "OPEN" | "CLICK" | "REPLY" | "BOUNCE" | "SEND_CONFIRMED";
  occurredAt: string;
  automated: boolean;
  reason?: string;
  userAgent?: string;
}

export interface MessageHistory {
  id: number;
  subject: string;
  mailbox: string;
  sentAt: string | null;
  createdAt: string;
  events: TrackingEventRow[];
}

export interface HistoryState {
  loading: boolean;
  error?: string;
  messages?: MessageHistory[];
}

/**
 * One entry in the flattened, chronological timeline: either a message
 * being queued/sent, or a tracking event under it. Flattening across all
 * messages (rather than nesting events inside a per-message block, as an
 * earlier version of this did) makes "what happened, in what order" the
 * primary read -- a resend after a bounce, for instance, reads as a single
 * line down the page instead of two separate boxes a person has to compare
 * timestamps across.
 */
type TimelineEntry =
  | { kind: "queued"; at: string; message: MessageHistory }
  | { kind: "sent"; at: string; message: MessageHistory }
  | { kind: "event"; at: string; message: MessageHistory; event: TrackingEventRow };

function buildTimeline(messages: MessageHistory[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const m of messages) {
    entries.push({ kind: "queued", at: m.createdAt, message: m });
    if (m.sentAt) entries.push({ kind: "sent", at: m.sentAt, message: m });
    for (const e of m.events) entries.push({ kind: "event", at: e.occurredAt, message: m, event: e });
  }
  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

const EVENT_META: Record<
  TrackingEventRow["type"],
  { label: string; icon: typeof Mail; dot: string }
> = {
  SEND_CONFIRMED: { label: "Send confirmed", icon: CheckCircle2, dot: "bg-blue-500" },
  OPEN: { label: "Opened", icon: Eye, dot: "bg-amber-500" },
  CLICK: { label: "Clicked booking link", icon: MousePointerClick, dot: "bg-purple-500" },
  REPLY: { label: "Replied", icon: Reply, dot: "bg-green-500" },
  BOUNCE: { label: "Bounced", icon: XCircle, dot: "bg-red-500" },
};

function formatWhen(iso: string): { relative: string; absolute: string } {
  const date = new Date(iso);
  const absolute = date.toLocaleString();
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  let relative: string;
  if (diffMin < 1) relative = "just now";
  else if (diffMin < 60) relative = `${diffMin}m ago`;
  else if (diffMin < 60 * 24) relative = `${Math.round(diffMin / 60)}h ago`;
  else relative = `${Math.round(diffMin / (60 * 24))}d ago`;
  return { relative, absolute };
}

function TimelineRow({ children, dotClassName }: { children: ReactNode; dotClassName: string }) {
  return (
    <div className="relative flex gap-3 pb-4 pl-1 last:pb-0">
      <div className="absolute bottom-0 left-[7px] top-2 w-px bg-border/60 last:hidden" aria-hidden />
      <span className={clsx("relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-background", dotClassName)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Full, chronological "what actually happened" view for one prospect --
 * every message queued/sent and every tracking event under it, including
 * events flagged `automated` (a Safe Links-style scan, most likely) that
 * the main table's status column deliberately doesn't count as real
 * engagement. Nothing here is hidden or filtered.
 */
export function HistoryTimeline({ state }: { state?: HistoryState }) {
  if (!state || (state.loading && !state.messages)) {
    return <p className="text-xs text-foreground/60">Loading history…</p>;
  }
  if (state.error && !state.messages) {
    return <p className="text-xs text-red-600">Failed to load history: {state.error}</p>;
  }
  const messages = state.messages ?? [];
  if (messages.length === 0) {
    return <p className="text-xs text-foreground/60">No messages sent to this prospect yet.</p>;
  }

  const timeline = buildTimeline(messages);

  return (
    <div className="space-y-1">
      {state.loading ? <p className="mb-2 text-xs text-foreground/40">Refreshing…</p> : null}
      {state.error ? (
        <p className="mb-2 text-xs text-red-600">Showing last-loaded history — refresh failed: {state.error}</p>
      ) : null}
      <div className="flex flex-col">
        {timeline.map((entry, i) => {
          const { relative, absolute } = formatWhen(entry.at);
          const key = `${entry.kind}-${entry.kind === "event" ? entry.event.id : entry.message.id}-${i}`;

          if (entry.kind === "queued") {
            return (
              <TimelineRow key={key} dotClassName="bg-slate-400">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-sm font-medium">
                    <Mail className="mr-1.5 inline-block h-3.5 w-3.5 -translate-y-px text-foreground/50" />
                    Queued: {entry.message.subject}
                  </span>
                  <span className="text-xs text-foreground/50" title={absolute}>
                    {relative}
                  </span>
                </div>
              </TimelineRow>
            );
          }

          if (entry.kind === "sent") {
            return (
              <TimelineRow key={key} dotClassName="bg-blue-400">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="text-sm font-medium">Sent from {entry.message.mailbox}</span>
                  <span className="text-xs text-foreground/50" title={absolute}>
                    {relative}
                  </span>
                </div>
              </TimelineRow>
            );
          }

          const meta = EVENT_META[entry.event.type];
          const Icon = meta.icon;
          return (
            <TimelineRow key={key} dotClassName={entry.event.automated ? "bg-slate-300" : meta.dot}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                <span className={clsx("flex items-center gap-1.5 text-sm font-medium", entry.event.automated && "text-foreground/50")}>
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                  {entry.event.automated ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-foreground/50"
                      title={entry.event.reason}
                    >
                      <Bot className="h-3 w-3" /> automated scan, not counted
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-foreground/50" title={absolute}>
                  {relative}
                </span>
              </div>
            </TimelineRow>
          );
        })}
      </div>
    </div>
  );
}
