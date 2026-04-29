import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { OutreachSequence } from "@/lib/job-hunter/types";

export function SequenceCard({ sequence, subtitle, value, onEdit, onSave, onCopy, actions }: { sequence: OutreachSequence; subtitle: ReactNode; value: string; onEdit: (v: string) => void; onSave: () => void; onCopy: () => void; actions: Array<{ label: string; onClick: () => void; variant?: "outline" | "secondary" | "default" }>; }) {
  return <article className="space-y-2 rounded-lg border border-border/60 p-4 text-sm"><p>{subtitle}</p><p className="text-xs text-foreground/70">{sequence.channel} · {sequence.stage}</p><textarea className="min-h-24 w-full rounded border p-2" value={value} onChange={(event) => onEdit(event.target.value)} /><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={onSave}>Edit</Button><Button type="button" variant="secondary" onClick={onCopy}>Copy</Button>{actions.map((action) => <Button key={action.label} type="button" variant={action.variant} onClick={action.onClick}>{action.label}</Button>)}</div></article>;
}
