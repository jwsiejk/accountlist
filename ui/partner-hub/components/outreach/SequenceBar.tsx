"use client";

import { clsx } from "clsx";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Template } from "./TemplatesPanel";
import type { BatchSummary } from "./types";

type Step = 1 | 2 | 3;

/**
 * Email 1 / Email 2 / Email 3 side by side for the batch on screen: how many
 * got each email, how each email did (opens, clicks, replies, bounces counted
 * against that email only), and a one-click "send the next email to everyone
 * ready for it" -- in the same batch, with Email 1's history left exactly as
 * it is. Picking a card also sets which email the Send controls below act on.
 */
export function SequenceBar({
  summary,
  scopeLabel,
  activeStep,
  templates,
  delays,
  busy,
  onPickStep,
  onSendReady,
  onCreateTemplate,
}: {
  summary: BatchSummary;
  scopeLabel: string;
  activeStep: Step;
  templates: Template[];
  delays: { email2DelayDays: number; email3DelayDays: number };
  busy: boolean;
  onPickStep: (step: Step) => void;
  onSendReady: (step: Step, includeScheduled: boolean) => void;
  onCreateTemplate: (step: Step) => void;
}) {
  const steps: Step[] = [1, 2, 3];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-foreground/55">
        <span className="font-semibold uppercase tracking-wide text-foreground/45">Sequence</span>
        <span>{scopeLabel} · pick an email to work on it below; each email is tracked on its own.</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const i = step - 1;
          const sent = summary.sentByStep[i];
          const ready = summary.readyByStep[i];
          const scheduled = summary.scheduledByStep[i];
          const template = templates.find((t) => t.sequenceStep === step);
          const active = step === activeStep;
          const pct = (n: number) => (sent > 0 ? ` (${Math.round((n / sent) * 100)}%)` : "");
          const waitingOn =
            step > 1 && ready === 0 && scheduled === 0 && summary.sentByStep[i - 1] === 0 ? `Waits for Email ${step - 1}` : null;

          return (
            <div
              key={step}
              role="button"
              tabIndex={0}
              onClick={() => onPickStep(step)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPickStep(step);
                }
              }}
              aria-pressed={active}
              className={clsx(
                "flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-4 text-left transition",
                active
                  ? "border-button-primary shadow-sm ring-1 ring-button-primary"
                  : "border-border/60 hover:border-border hover:shadow-sm"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={clsx(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums",
                      active ? "bg-button-primary text-button-primary-foreground" : "bg-muted text-foreground/60"
                    )}
                  >
                    {step}
                  </span>
                  Email {step}
                </span>
                <span className="truncate text-xs text-foreground/50" title={template?.name}>
                  {template ? template.name : step === 1 ? "" : "No template yet"}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">{sent}</span>
                <span className="text-xs text-foreground/60">sent</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-foreground/60">
                <span>
                  <span className="font-medium text-foreground/80 tabular-nums">{summary.openedByStep[i]}</span> opened
                  {pct(summary.openedByStep[i])}
                </span>
                <span>
                  <span className="font-medium text-foreground/80 tabular-nums">{summary.clickedByStep[i]}</span> clicked
                </span>
                <span>
                  <span className="font-medium text-foreground/80 tabular-nums">{summary.repliedByStep[i]}</span> replied
                </span>
                {summary.bouncedByStep[i] ? (
                  <span className="text-red-700 dark:text-red-400">
                    <span className="font-medium tabular-nums">{summary.bouncedByStep[i]}</span> bounced
                  </span>
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                {ready > 0 && step > 1 && !template ? (
                  <Button size="sm" variant="secondary" onClick={() => onCreateTemplate(step)}>
                    Create Email {step} template first
                  </Button>
                ) : ready > 0 ? (
                  <Button size="sm" onClick={() => onSendReady(step, false)} disabled={busy}>
                    <Send className="h-3.5 w-3.5" /> Send Email {step} to {ready} ready
                  </Button>
                ) : null}
                {scheduled > 0 && (template || step === 1) ? (
                  <button
                    type="button"
                    onClick={() => onSendReady(step, true)}
                    disabled={busy}
                    className="text-xs font-medium text-foreground/60 underline decoration-dotted hover:text-foreground disabled:opacity-50"
                    title={`Suggested gap is ${step === 2 ? delays.email2DelayDays : delays.email3DelayDays} days after Email ${step - 1}; you can send early.`}
                  >
                    {ready > 0 ? `+ include ${scheduled} not yet due` : `Send early to ${scheduled} not yet due`}
                  </button>
                ) : null}
                {ready === 0 && scheduled === 0 ? (
                  <span className="text-xs text-foreground/40">{waitingOn ?? "Nobody waiting"}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
