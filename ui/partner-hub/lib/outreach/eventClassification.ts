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
// actually sitting in the recipient's mailbox -- but "dispatchedAt" here is
// when the send *request* reached the relay (Gmail inbox -> Power Automate
// trigger -> Outlook connector -> Exchange delivery), and that chain has
// its own latency before the message is actually delivered and scanned.
// Since Power Automate's trigger can itself be polling-based rather than
// instant, real delivery can lag dispatch by more than a few seconds.
// 5 minutes is generous enough to absorb that relay latency while still
// being far faster than a human noticing, reading, and deciding to click --
// a real person being *that* fast is the rarer failure mode to accept here
// versus the much more common false positive from an unfiltered scanner.
const AUTOMATED_WINDOW_MS = 5 * 60_000;

export interface EventClassification {
  automated: boolean;
  reason?: string;
}

export function classifyTrackingEvent(params: {
  /**
   * When the send was actually dispatched to the relay -- use
   * OutreachMessage.createdAt, NOT sentAt. sentAt is only populated later,
   * asynchronously, once the IMAP poller parses a confirmation email back
   * from the relay mailbox (which can take minutes), so it's frequently
   * still null at the exact moment a scanner would hit the link -- which
   * silently skipped this entire check when this took sentAt instead.
   * createdAt is set immediately after dispatchSendRequest() returns, i.e.
   * effectively at real send time, and is never null.
   */
  dispatchedAt: Date;
  occurredAt: Date;
  userAgent?: string;
}): EventClassification {
  const { dispatchedAt, occurredAt, userAgent } = params;

  const elapsedMs = occurredAt.getTime() - dispatchedAt.getTime();
  if (elapsedMs >= 0 && elapsedMs < AUTOMATED_WINDOW_MS) {
    return {
      automated: true,
      reason: `occurred ${Math.round(elapsedMs / 1000)}s after send -- consistent with automated link-scanning (e.g. Microsoft Safe Links), not a human read`,
    };
  }

  if (userAgent && SCANNER_UA_PATTERN.test(userAgent)) {
    return { automated: true, reason: "user-agent matches known scanner/crawler pattern" };
  }

  return { automated: false };
}
