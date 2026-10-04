/**
 * Best-effort heuristic for telling a real recipient open/click apart from
 * an automated one -- mainly Microsoft Defender for Office 365 "Safe
 * Links"/"Safe Attachments", which crawls every URL (and often the tracking
 * pixel too) in a mailbox as soon as the message arrives, well before any
 * human has read it. There's no reliable, documented signal to detect this
 * (the scanner's user-agent isn't fixed and can mimic a real browser), so
 * this errs on flagging events that happen suspiciously fast after send.
 *
 * Nothing gets discarded because of this -- every event is still logged via
 * logEvent() regardless of the verdict here. The verdict only decides
 * whether the event is allowed to advance the prospect's single-value
 * status (see markStatus in prospects.ts), so the full raw history stays
 * inspectable even for events we don't trust.
 */

// Loose match for known link-scanning / security-gateway products. Not
// exhaustive, and easy for a determined scanner to spoof -- this is a
// secondary signal, the timing check below is the primary one.
const SCANNER_UA_PATTERN =
  /bot|crawler|spider|scan|safelink|threatprotection|atp[-_]?probe|proofpoint|mimecast|barracuda|ips-agent|link[-_]?checker|preview|urlprotect/i;

// Safe Links-style detonation happens near-instantly once the message is
// actually sitting in the recipient's mailbox -- but the moment it lands is
// usually NOT known when the scan hits. "dispatchedAt" is when the send
// *request* reached the relay, and the chain after it (Gmail inbox -> Power
// Automate's polling trigger -> Outlook connector -> Exchange delivery ->
// the recipient's own gateway) routinely adds several minutes on its own.
// Production showed scanner clicks landing just past the old 5-minute
// window and being counted as real engagement, so this is measured two
// ways: generously from dispatch, and tightly from the confirmed send time
// when the send-flow's confirmation has already been processed.
const AUTOMATED_WINDOW_FROM_DISPATCH_MS = 15 * 60_000;
const AUTOMATED_WINDOW_FROM_CONFIRMED_SEND_MS = 5 * 60_000;

// Scanners rarely hit a link once: they fan out across every link, retry,
// and detonate from several sandboxes in quick succession. A human clicks
// once (maybe twice, a few seconds apart, if the page was slow). So an
// event arriving right after an event we already judged automated is
// almost certainly the same scan still running, and three or more events
// packed into a few seconds is a scan regardless of how early they were.
const BURST_AFTER_AUTOMATED_MS = 2 * 60_000;
const DENSE_BURST_WINDOW_MS = 10_000;
const DENSE_BURST_MIN_PRIOR_EVENTS = 2;

export interface EventClassification {
  automated: boolean;
  reason?: string;
}

export interface PriorTrackingEvent {
  occurredAt: Date;
  automated: boolean;
}

export function classifyTrackingEvent(params: {
  /**
   * When the send was dispatched to the relay -- OutreachMessage.createdAt.
   * Always set, so it's the fallback timing reference.
   */
  dispatchedAt: Date;
  /**
   * OutreachMessage.sentAt, once the send-flow's confirmation has been
   * processed (backdated to the flow's own CONFIRMED_AT when it sends one).
   * Often still null when a scanner hits, which is why dispatchedAt exists.
   */
  confirmedSentAt?: Date | null;
  occurredAt: Date;
  userAgent?: string;
  /** Earlier open/click events on the same message, any order. */
  priorEvents?: PriorTrackingEvent[];
}): EventClassification {
  const { dispatchedAt, confirmedSentAt, occurredAt, userAgent, priorEvents = [] } = params;
  const at = occurredAt.getTime();

  const sinceDispatchMs = at - dispatchedAt.getTime();
  if (sinceDispatchMs >= 0 && sinceDispatchMs < AUTOMATED_WINDOW_FROM_DISPATCH_MS) {
    return {
      automated: true,
      reason: `occurred ${Math.round(sinceDispatchMs / 1000)}s after send -- consistent with automated link-scanning (e.g. Microsoft Safe Links), not a human read`,
    };
  }

  if (confirmedSentAt) {
    const sinceSendMs = at - confirmedSentAt.getTime();
    if (sinceSendMs >= 0 && sinceSendMs < AUTOMATED_WINDOW_FROM_CONFIRMED_SEND_MS) {
      return {
        automated: true,
        reason: `occurred ${Math.round(sinceSendMs / 1000)}s after confirmed delivery -- consistent with automated link-scanning`,
      };
    }
  }

  if (userAgent && SCANNER_UA_PATTERN.test(userAgent)) {
    return { automated: true, reason: "user-agent matches known scanner/crawler pattern" };
  }

  const before = priorEvents.filter((e) => e.occurredAt.getTime() <= at);

  const followsAutomated = before.some((e) => e.automated && at - e.occurredAt.getTime() < BURST_AFTER_AUTOMATED_MS);
  if (followsAutomated) {
    return { automated: true, reason: "part of a burst that began with an automated scan" };
  }

  const dense = before.filter((e) => at - e.occurredAt.getTime() < DENSE_BURST_WINDOW_MS).length;
  if (dense >= DENSE_BURST_MIN_PRIOR_EVENTS) {
    return { automated: true, reason: `${dense + 1} hits within ${DENSE_BURST_WINDOW_MS / 1000}s -- consistent with automated scanning` };
  }

  return { automated: false };
}
