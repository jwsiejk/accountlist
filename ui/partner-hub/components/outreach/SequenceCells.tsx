"use client";

import { clsx } from "clsx";
import { Eye, MousePointerClick, Reply, XCircle } from "lucide-react";

import { fullWhen, shortDay, type StepEngagement, type StepInfo } from "./types";

/** Opened / clicked / replied / bounced marks for one email, shown under its "Sent" pill. */
function EngagementMarks({ engagement, step }: { engagement?: StepEngagement; step: number }) {
  if (!engagement) return null;
  const marks = [
    engagement.opened && { key: "o", Icon: Eye, cls: "text-amber-600 dark:text-amber-400", label: "Opened" },
    engagement.clicked && { key: "c", Icon: MousePointerClick, cls: "text-purple-600 dark:text-purple-400", label: "Clicked" },
    engagement.replied && { key: "r", Icon: Reply, cls: "text-green-600 dark:text-green-400", label: "Replied" },
    engagement.bounced && { key: "b", Icon: XCircle, cls: "text-red-600 dark:text-red-400", label: "Bounced" },
  ].filter(Boolean) as { key: string; Icon: typeof Eye; cls: string; label: string }[];
  if (marks.length === 0) return null;
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 align-middle">
      {marks.map(({ key, Icon, cls, label }) => (
        <span key={key} title={`${label} Email ${step}`} aria-label={`${label} Email ${step}`} className="inline-flex">
          <Icon className={clsx("h-3.5 w-3.5", cls)} aria-hidden />
        </span>
      ))}
    </span>
  );
}

/**
 * One cell of the Email 1 / Email 2 / Email 3 columns: what happened with
 * (or is next for) a contact on that email, in a glance-able form.
 */
export function StepCell({ info, engagement }: { info: StepInfo; engagement?: StepEngagement }) {
  switch (info.state) {
    case "sent":
      return (
        <span className="inline-flex items-center whitespace-nowrap">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300"
            title={
              info.evidence === "tracking"
                ? `Queued ${fullWhen(info.sentAt)}. The send-flow never confirmed it, but it was opened or clicked, so it arrived. It won't be sent again.`
                : `Sent ${fullWhen(info.sentAt)}`
            }
          >
            Sent {shortDay(info.sentAt)}
            {info.evidence === "tracking" ? "*" : ""}
          </span>
          <EngagementMarks engagement={engagement} step={info.step} />
        </span>
      );
    case "queued":
      return (
        <span
          className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          title="Send requested; waiting for the send-flow to confirm it went out."
        >
          Queued…
        </span>
      );
    case "due":
      return (
        <span
          className={clsx(
            "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
            info.unconfirmed
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          )}
          title={
            info.unconfirmed
              ? "An earlier send request for this email was never confirmed, so it probably didn't go out. Check Sent Items, then mark as sent or resend."
              : "Ready to send now."
          }
        >
          {info.unconfirmed ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden /> Not confirmed
            </>
          ) : (
            "Ready"
          )}
        </span>
      );
    case "scheduled":
      return (
        <span
          className="inline-flex whitespace-nowrap rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-foreground/60"
          title={`Suggested send date ${fullWhen(info.dueAt)}. You can still send it earlier.`}
        >
          Due {shortDay(info.dueAt)}
        </span>
      );
    case "stopped":
      return (
        <span className="text-xs text-foreground/40" title="Sequence stopped: this contact replied or bounced.">
          Stopped
        </span>
      );
    default:
      return (
        <span className="text-xs text-foreground/30" title="Waiting for the previous email to be sent.">
          —
        </span>
      );
  }
}
