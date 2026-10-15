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
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-foreground/60">
        Sequence — {scopeLabel}. Each email is tracked on its own; earlier emails&apos; history stays as it is.
      </div>
      <div className="grid gap-2 md:grid-cols-3">
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
                "flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-left transition",
                active ? "border-button-primary bg-muted/40 ring-1 ring-button-primary" : "border-border/60 hover:bg-muted/30"
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">Email {step}</span>
                <span className="truncate text-xs text-foreground/50" title={template?.name}>
                  {template ? template.name : step === 1 ? "" : "No template yet"}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">{sent}</span>
                <span className="text-xs text-foreground/60">sent</span>
              </div>
              <div className="text-xs text-foreground/60">
                Opened {summary.openedByStep[i]}
                {pct(summary.openedByStep[i])} · Clicked {summary.clickedByStep[i]} · Replied {summary.repliedByStep[i]}
                {summary.bouncedByStep[i] ? ` · Bounced ${summary.bouncedByStep[i]}` : ""}
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
                  <span className="text-xs text-foreground/40">{waitingOn ?? "Nobody waiting for this email"}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
