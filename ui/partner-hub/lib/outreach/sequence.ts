/**
 * Email sequence tracking (Email 1 -> Email 2 -> Email 3) for one prospect,
 * plus roll-ups across a group of prospects (a batch).
 *
 * Pure functions over plain data -- no database access -- so the rules for
 * "who can be sent which email next, and when is it due" live in one place
 * that the send route, the dashboard API and the report all share, and can
 * be unit-tested without a database. See sequence.test.ts.
 *
 * How progress is derived: nothing is stored as "current step". It is
 * computed from the prospect's OutreachMessage rows (each carries the `step`
 * it was sent as). That is what makes moving a contact between batches safe
 * -- the history is attached to the prospect, so it moves with them -- and
 * why a removed-and-reimported contact starts again from Email 1.
 */

export const SEQUENCE_STEPS = [1, 2, 3] as const;
export type SequenceStep = (typeof SEQUENCE_STEPS)[number];

/**
 * A send request that was queued but never confirmed by the send-flow within
 * this window is treated as failed (the relay chain dropped it): it stops
 * blocking the step, so it can be sent again. Mirrors the "stuck at SENDING"
 * problem the dashboard's Reset button exists for.
 */
export const QUEUED_GRACE_MS = 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ProspectStatusName =
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "OPENED"
  | "CLICKED"
  | "REPLIED"
  | "BOUNCED";

export interface SequenceMessage {
  step: number;
  /** null until the send-flow's confirmation is processed. */
  sentAt: Date | null;
  /** When the send request was queued. */
  createdAt: Date;
  /**
   * Earliest open or click recorded for this message, automated scans
   * included. A scanner or a person can only hit the tracking links of an
   * email that actually arrived, so this is proof of delivery even when the
   * send-flow's confirmation never came back -- and such a contact must
   * never be offered the same email again.
   */
  deliveredAt?: Date | null;
}

/** What a prospect's recorded history says about stopping the sequence. */
export type StopSignal = "REPLIED" | "BOUNCED" | null;

export interface SequenceProspect {
  status: ProspectStatusName;
  messages: SequenceMessage[];
  /**
   * A reply or bounce found in the event history. Checked alongside
   * `status` so that resetting the status label (the dashboard's Reset
   * button) can never make a contact who replied or bounced eligible for
   * the next email.
   */
  stopSignal?: StopSignal;
}

/** Earliest open/click time across a message's events (any verdict), or null. */
export function deliveredAtFromEvents(events: { type: string; occurredAt: Date }[]): Date | null {
  let earliest: Date | null = null;
  for (const e of events) {
    if (e.type !== "OPEN" && e.type !== "CLICK") continue;
    if (!earliest || e.occurredAt < earliest) earliest = e.occurredAt;
  }
  return earliest;
}

/** A reply or bounce anywhere in a prospect's event history (reply wins). */
export function stopSignalFromEvents(events: { type: string }[]): StopSignal {
  if (events.some((e) => e.type === "REPLY")) return "REPLIED";
  if (events.some((e) => e.type === "BOUNCE")) return "BOUNCED";
  return null;
}

export interface SequenceDelays {
  /** Suggested days between Email 1 being sent and Email 2 being due. */
  email2DelayDays: number;
  /** Suggested days between Email 2 being sent and Email 3 being due. */
  email3DelayDays: number;
}

export const DEFAULT_DELAYS: SequenceDelays = { email2DelayDays: 3, email3DelayDays: 4 };

/**
 * - sent       confirmed sent (sentAt set)
 * - queued     send requested, awaiting the send-flow's confirmation
 * - due        can be sent now (Email 1 always; Email 2/3 once the gap has passed)
 * - scheduled  previous email is sent but the suggested gap hasn't elapsed
 *              yet -- can still be sent early by choice
 * - waiting    an earlier email in the sequence hasn't been sent yet
 * - stopped    the contact replied or bounced before this email went out
 */
export type StepState = "sent" | "queued" | "due" | "scheduled" | "waiting" | "stopped";

export interface StepInfo {
  step: SequenceStep;
  state: StepState;
  /** Confirmed send time, when state is "sent". */
  sentAt: Date | null;
  /**
   * Why a "sent" step counts as sent: the send-flow confirmed it (or it was
   * marked sent by hand), or only an open/click proves it arrived.
   */
  evidence?: "confirmed" | "tracking";
  /** When this email is/was suggested to go out; null for Email 1 or if unknown. */
  dueAt: Date | null;
  /**
   * True when an earlier send request for this step was never confirmed
   * within QUEUED_GRACE_MS -- worth surfacing, since it probably didn't go out.
   */
  unconfirmed: boolean;
}

export type SequenceStatus = "not_started" | "in_progress" | "complete" | "replied" | "bounced";

export interface SequenceState {
  steps: StepInfo[];
  /** The next email that could be sent, or null if none (done, stopped, or one is in flight). */
  nextStep: SequenceStep | null;
  status: SequenceStatus;
}

export function delayDaysForStep(step: SequenceStep, delays: SequenceDelays): number {
  if (step === 2) return Math.max(0, delays.email2DelayDays);
  if (step === 3) return Math.max(0, delays.email3DelayDays);
  return 0;
}

export function computeSequence(
  prospect: SequenceProspect,
  delays: SequenceDelays = DEFAULT_DELAYS,
  now: Date = new Date()
): SequenceState {
  const stopReason = stopReasonOf(prospect);
  const stopped = stopReason !== null;
  const steps: StepInfo[] = [];

  for (const step of SEQUENCE_STEPS) {
    const forStep = prospect.messages.filter((m) => m.step === step);

    // If it was sent more than once (e.g. a stale retry later confirmed too),
    // the earliest confirmation is when this email first reached them.
    const confirmed = forStep
      .filter((m) => m.sentAt)
      .sort((a, b) => a.sentAt!.getTime() - b.sentAt!.getTime())[0];
    // No confirmation, but an open/click proves it arrived: it's sent.
    const tracked = confirmed
      ? undefined
      : forStep
          .filter((m) => m.deliveredAt)
          .sort((a, b) => a.deliveredAt!.getTime() - b.deliveredAt!.getTime())[0];
    if (tracked) {
      steps.push({ step, state: "sent", sentAt: tracked.createdAt, dueAt: null, unconfirmed: false, evidence: "tracking" });
      continue;
    }
    const unconfirmedMessages = forStep.filter((m) => !m.sentAt);
    const inFlight = unconfirmedMessages.some((m) => now.getTime() - m.createdAt.getTime() < QUEUED_GRACE_MS);
    const unconfirmed = !confirmed && !inFlight && unconfirmedMessages.length > 0;

    if (confirmed) {
      steps.push({ step, state: "sent", sentAt: confirmed.sentAt, dueAt: null, unconfirmed: false, evidence: "confirmed" });
      continue;
    }
    if (inFlight) {
      steps.push({ step, state: "queued", sentAt: null, dueAt: null, unconfirmed: false });
      continue;
    }
    if (stopped) {
      steps.push({ step, state: "stopped", sentAt: null, dueAt: null, unconfirmed });
      continue;
    }

    if (step === 1) {
      steps.push({ step, state: "due", sentAt: null, dueAt: null, unconfirmed });
      continue;
    }

    const prior = steps[step - 2];
    if (prior.state !== "sent" || !prior.sentAt) {
      steps.push({ step, state: "waiting", sentAt: null, dueAt: null, unconfirmed });
      continue;
    }
    const dueAt = new Date(prior.sentAt.getTime() + delayDaysForStep(step, delays) * DAY_MS);
    steps.push({
      step,
      state: now.getTime() >= dueAt.getTime() ? "due" : "scheduled",
      sentAt: null,
      dueAt,
      unconfirmed,
    });
  }

  const nextStep = steps.find((s) => s.state === "due" || s.state === "scheduled")?.step ?? null;

  let status: SequenceStatus;
  if (stopReason === "REPLIED") status = "replied";
  else if (stopReason === "BOUNCED") status = "bounced";
  else if (steps.every((s) => s.state === "sent")) status = "complete";
  else if (steps.some((s) => s.state === "sent" || s.state === "queued")) status = "in_progress";
  else status = "not_started";

  return { steps, nextStep, status };
}

/**
 * Whether `step` can be sent to this prospect right now. "scheduled" counts:
 * sending Email 2 a day early is the rep's call, so it's allowed (the
 * dashboard labels it), but never out of order, twice, or after a reply/bounce.
 */
export function checkSendable(
  prospect: SequenceProspect,
  step: SequenceStep,
  delays: SequenceDelays = DEFAULT_DELAYS,
  now: Date = new Date()
): { ok: true } | { ok: false; reason: string } {
  const info = computeSequence(prospect, delays, now).steps[step - 1];
  switch (info.state) {
    case "due":
    case "scheduled":
      return { ok: true };
    case "sent":
      return { ok: false, reason: `Email ${step} was already sent.` };
    case "queued":
      return { ok: false, reason: `Email ${step} is already queued and awaiting send confirmation.` };
    case "waiting":
      return { ok: false, reason: `Email ${step - 1} hasn't been sent yet.` };
    case "stopped":
      return {
        ok: false,
        reason:
          stopReasonOf(prospect) === "REPLIED"
            ? "This contact replied, so the sequence is stopped."
            : "This contact's email bounced, so the sequence is stopped.",
      };
  }
}

function stopReasonOf(prospect: SequenceProspect): StopSignal {
  if (prospect.status === "REPLIED" || prospect.stopSignal === "REPLIED") return "REPLIED";
  if (prospect.status === "BOUNCED" || prospect.stopSignal === "BOUNCED") return "BOUNCED";
  return null;
}

/**
 * Which dashboard view a contact belongs in, so contacts whose emails went
 * out are kept apart from ones being troubleshot:
 * - attention    a send was requested but never confirmed or seen to arrive
 * - in_flight    a send was just requested, waiting for confirmation
 * - on_track     every requested email is accounted for (or replied/bounced)
 * - not_started  nothing sent yet
 */
export type ContactHealth = "attention" | "in_flight" | "on_track" | "not_started";

export function contactHealth(sequence: SequenceState): ContactHealth {
  if (sequence.steps.some((s) => s.unconfirmed && (s.state === "due" || s.state === "scheduled"))) return "attention";
  if (sequence.steps.some((s) => s.state === "queued")) return "in_flight";
  if (sequence.status === "not_started") return "not_started";
  return "on_track";
}

export interface BatchSummary {
  total: number;
  /** Contacts with Email N confirmed sent, by step (index 0 = Email 1). */
  sentByStep: [number, number, number];
  /** Contacts for whom Email N can be sent right now (state "due"). */
  dueByStep: [number, number, number];
  notStarted: number;
  inProgress: number;
  complete: number;
  /** Contacts who have ever opened / clicked / replied, on any email. Opens
   *  and clicks exclude suspected automated link-scanner activity. */
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
}

export interface Engagement {
  opened: boolean;
  clicked: boolean;
  replied: boolean;
}

/**
 * Roll up many prospects into the counts shown in the batch header and the
 * report. Engagement flags come from the tracked events (not the prospect's
 * single status value, which only keeps the strongest signal -- a REPLIED
 * contact who also opened and clicked would otherwise count only as a reply).
 */
export function summarizeBatch(
  prospects: { status: ProspectStatusName; sequence: SequenceState; engagement: Engagement }[]
): BatchSummary {
  const s: BatchSummary = {
    total: prospects.length,
    sentByStep: [0, 0, 0],
    dueByStep: [0, 0, 0],
    notStarted: 0,
    inProgress: 0,
    complete: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
  };

  for (const p of prospects) {
    p.sequence.steps.forEach((info, i) => {
      if (info.state === "sent") s.sentByStep[i]++;
      if (info.state === "due") s.dueByStep[i]++;
    });
    if (p.sequence.status === "not_started") s.notStarted++;
    if (p.sequence.status === "in_progress") s.inProgress++;
    if (p.sequence.status === "complete") s.complete++;
    if (p.engagement.opened) s.opened++;
    if (p.engagement.clicked) s.clicked++;
    if (p.engagement.replied || p.status === "REPLIED") s.replied++;
    if (p.status === "BOUNCED") s.bounced++;
  }
  return s;
}
