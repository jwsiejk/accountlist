"use client";

import { clsx } from "clsx";

import { fullWhen, shortDay, type StepInfo } from "./types";

/**
 * One cell of the Email 1 / Email 2 / Email 3 columns: what happened with
 * (or is next for) a contact on that email, in a glance-able form.
 */
export function StepCell({ info }: { info: StepInfo }) {
  switch (info.state) {
    case "sent":
      return (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300"
          title={`Sent ${fullWhen(info.sentAt)}`}
        >
          Sent {shortDay(info.sentAt)}
        </span>
      );
    case "queued":
      return (
        <span
          className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          title="Send requested; waiting for the send-flow to confirm it went out."
        >
          Queued…
        </span>
      );
    case "due":
      return (
        <span
          className={clsx(
            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
            info.unconfirmed
              ? "border-amber-400 text-amber-800 dark:text-amber-300"
              : "border-button-primary text-foreground"
          )}
          title={
            info.unconfirmed
              ? "An earlier send request for this email was never confirmed, so it probably didn't go out. It can be sent again."
              : "Ready to send now."
          }
        >
          {info.unconfirmed ? "Retry — not confirmed" : "Ready"}
        </span>
      );
    case "scheduled":
      return (
        <span
          className="inline-flex rounded-full border border-border/60 px-2 py-0.5 text-xs text-foreground/60"
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
