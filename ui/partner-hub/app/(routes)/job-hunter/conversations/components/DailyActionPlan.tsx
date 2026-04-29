import type { Dispatch, SetStateAction } from "react";
import type { JobHunterStore } from "@/lib/job-hunter/types";
import type { buildDailyConversationActions } from "@/lib/job-hunter/conversationActions";

type DailyAction = ReturnType<typeof buildDailyConversationActions>[number];

export function DailyActionPlan({ dailyActions, draftEdits, setDraftEdits, store, onActionMarkSent, onActionSkip }: {
  dailyActions: DailyAction[];
  draftEdits: Record<string, string>;
  setDraftEdits: Dispatch<SetStateAction<Record<string, string>>>;
  store: JobHunterStore;
  onActionMarkSent: (sequenceId?: string) => void;
  onActionSkip: (sequenceId?: string) => void;
}) {
  return <section className="space-y-3 rounded-lg border border-border/60 p-4 text-sm">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Today's Action Plan</h2>
      <p className="text-xs text-foreground/70">Top {dailyActions.length} prioritized actions</p>
    </div>
    {dailyActions.length === 0 ? <p className="text-sm text-foreground/70">No immediate actions today.</p> : <div className="space-y-2">{dailyActions.map((action) => <article key={action.id} className="rounded border border-border/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{action.priority} · {action.label}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {action.supportedActions.includes("edit") && action.sequenceId ? <button type="button" onClick={() => setDraftEdits((prev) => ({ ...prev, [action.sequenceId as string]: draftEdits[action.sequenceId as string] ?? (store.outreachSequencesById[action.sequenceId as string]?.editedMessage ?? store.outreachSequencesById[action.sequenceId as string]?.generatedMessage ?? "") }))} className="rounded border border-border px-2 py-1">edit</button> : null}
          {action.supportedActions.includes("copy") ? <button type="button" onClick={() => void navigator.clipboard?.writeText(action.messagePreview ?? "")} className="rounded border border-border px-2 py-1">copy</button> : null}
          {action.supportedActions.includes("mark_sent") ? <button type="button" onClick={() => onActionMarkSent(action.sequenceId)} className="rounded border border-border px-2 py-1">mark sent</button> : null}
          {action.supportedActions.includes("skip") ? <button type="button" onClick={() => onActionSkip(action.sequenceId)} className="rounded border border-border px-2 py-1">skip</button> : null}
        </div>
      </div>
      <p className="text-xs text-foreground/70">{[action.company, action.roleTitle, action.contactName].filter(Boolean).join(" · ") || "General"}</p>
      <p className="mt-1 text-xs text-foreground/70">{action.description}{action.dueAt ? ` Due ${new Date(action.dueAt).toISOString().slice(0, 10)}.` : ""}</p>
      {action.messagePreview ? <p className="mt-1 line-clamp-2 text-xs">{action.messagePreview}</p> : null}
      {action.guide === "roles_needing_targets" ? <a href="#roles-needing-targets" className="mt-1 inline-block text-xs underline">Go to Roles Needing Targets</a> : null}
    </article>)}</div>}
  </section>;
}
