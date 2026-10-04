/**
 * Client-side shapes of GET /api/outreach/overview (dates arrive as ISO
 * strings). Mirrors lib/outreach/overviewTypes.ts, which holds the
 * server-side versions with real Date objects.
 */

export type ProspectStatus = "PENDING" | "SENDING" | "SENT" | "OPENED" | "CLICKED" | "REPLIED" | "BOUNCED";

export type StepState = "sent" | "queued" | "due" | "scheduled" | "waiting" | "stopped";

export interface StepInfo {
  step: 1 | 2 | 3;
  state: StepState;
  sentAt: string | null;
  dueAt: string | null;
  unconfirmed: boolean;
  /** For "sent": confirmed by the send-flow (or by hand), or only proven by an open/click. */
  evidence?: "confirmed" | "tracking";
}

/** Which view a contact belongs in -- see contactHealth() in lib/outreach/sequence.ts. */
export type ContactHealth = "attention" | "in_flight" | "on_track" | "not_started";

export type SequenceStatus = "not_started" | "in_progress" | "complete" | "replied" | "bounced";

export interface Contact {
  id: number;
  batchId: number | null;
  email: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  title: string | null;
  status: ProspectStatus;
  sequence: { steps: StepInfo[]; nextStep: 1 | 2 | 3 | null; status: SequenceStatus };
  health: ContactHealth;
  engagement: { opened: boolean; clicked: boolean; replied: boolean };
  lastActivityAt: string | null;
  createdAt: string;
}

export interface BatchSummary {
  total: number;
  sentByStep: [number, number, number];
  dueByStep: [number, number, number];
  notStarted: number;
  inProgress: number;
  complete: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
}

export interface BatchOverview {
  /** null = the "Unassigned" bucket. */
  id: number | null;
  name: string;
  createdAt: string | null;
  contacts: Contact[];
  summary: BatchSummary;
}

export interface Overview {
  campaign: {
    id: number;
    name: string;
    description: string | null;
    email2DelayDays: number;
    email3DelayDays: number;
  };
  batches: BatchOverview[];
  summary: BatchSummary;
}

export function shortDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fullWhen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "";
}

export function contactName(c: Pick<Contact, "firstName" | "lastName">): string {
  return `${c.firstName} ${c.lastName ?? ""}`.trim();
}

/** The browser's IANA time zone, passed to the report endpoints so times print in local time. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
