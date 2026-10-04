import {
  classifyTrackingEvent,
  type CrossRecipientEvent,
  type PriorTrackingEvent,
} from "./eventClassification";
import type { ProspectStatusName } from "./sequence";

/**
 * Re-runs the automated-scan check over open/click history that was logged
 * under older, looser rules, so existing "Opened"/"Clicked" badges reflect
 * the current filter. Pure functions here (no database); the route in
 * app/api/outreach/reclassify applies the result.
 *
 * Nothing is deleted: each event keeps its row and gets a new verdict and
 * reason, with the previous verdict kept alongside for reference.
 */

export interface StoredTrackingEvent {
  id: number;
  messageId: number;
  prospectId: number;
  type: "OPEN" | "CLICK";
  occurredAt: Date;
  userAgent?: string;
  ip?: string;
  automated: boolean;
  /** OutreachMessage.createdAt / sentAt for the message this event is on. */
  dispatchedAt: Date;
  confirmedSentAt: Date | null;
  recipientDomain: string;
}

export interface Verdict {
  id: number;
  automated: boolean;
  reason?: string;
  changed: boolean;
}

export function reclassifyEvents(events: StoredTrackingEvent[]): Verdict[] {
  const ordered = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id - b.id);
  const priorByMessage = new Map<number, PriorTrackingEvent[]>();
  const verdicts: Verdict[] = [];

  for (const e of ordered) {
    // History is fully known now, so cross-recipient checks look both ways
    // in time (classifyTrackingEvent compares absolute time differences).
    const crossRecipientEvents: CrossRecipientEvent[] = ordered
      .filter((o) => o.messageId !== e.messageId)
      .map((o) => ({ occurredAt: o.occurredAt, userAgent: o.userAgent, ip: o.ip, recipientDomain: o.recipientDomain }));

    const prior = priorByMessage.get(e.messageId) ?? [];
    const result = classifyTrackingEvent({
      dispatchedAt: e.dispatchedAt,
      confirmedSentAt: e.confirmedSentAt,
      occurredAt: e.occurredAt,
      userAgent: e.userAgent,
      ip: e.ip,
      recipientDomain: e.recipientDomain,
      priorEvents: prior,
      crossRecipientEvents,
    });
    prior.push({ occurredAt: e.occurredAt, automated: result.automated });
    priorByMessage.set(e.messageId, prior);
    verdicts.push({ id: e.id, automated: result.automated, reason: result.reason, changed: result.automated !== e.automated });
  }
  return verdicts;
}

/**
 * A prospect's status as the history now supports it. Only SENT / OPENED /
 * CLICKED are recomputed -- replies, bounces and in-flight sends are left
 * exactly as they are.
 */
export function statusFromHistory(
  current: ProspectStatusName,
  events: { type: "OPEN" | "CLICK"; automated: boolean }[]
): ProspectStatusName {
  if (current !== "SENT" && current !== "OPENED" && current !== "CLICKED") return current;
  if (events.some((e) => e.type === "CLICK" && !e.automated)) return "CLICKED";
  if (events.some((e) => e.type === "OPEN" && !e.automated)) return "OPENED";
  return "SENT";
}
