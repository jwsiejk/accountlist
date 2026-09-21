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

// Safe Links-style detonation typically happens within a few seconds of
// delivery. A real person reading and then clicking/opening an email
// realistically takes longer than this, so treat anything faster as
// automated. Deliberately generous (20s) to avoid flagging a genuinely fast
// human reader as a bot.
const AUTOMATED_WINDOW_MS = 20_000;

export interface EventClassification {
  automated: boolean;
  reason?: string;
}

export function classifyTrackingEvent(params: {
  sentAt: Date | null;
  occurredAt: Date;
  userAgent?: string;
}): EventClassification {
  const { sentAt, occurredAt, userAgent } = params;

  if (sentAt) {
    const elapsedMs = occurredAt.getTime() - sentAt.getTime();
    if (elapsedMs >= 0 && elapsedMs < AUTOMATED_WINDOW_MS) {
      return {
        automated: true,
        reason: `occurred ${Math.round(elapsedMs / 1000)}s after send -- consistent with automated link-scanning (e.g. Microsoft Safe Links), not a human read`,
      };
    }
  }

  if (userAgent && SCANNER_UA_PATTERN.test(userAgent)) {
    return { automated: true, reason: "user-agent matches known scanner/crawler pattern" };
  }

  return { automated: false };
}
