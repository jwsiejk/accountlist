/**
 * Telling a real recipient's open/click apart from an automated one.
 *
 * Security gateways at the companies this outreach goes to (Microsoft
 * Defender Safe Links, Proofpoint, Mimecast, ...) fetch every link -- and
 * often the tracking pixel -- in a delivered email, sometimes immediately and
 * sometimes again hours later, from sandboxes that pretend to be a browser.
 * Production data (Sept/Oct 2026) showed what those look like next to a real
 * person (the campaign owner testing on their own mailbox):
 *
 * - real:  Edge/Chrome 153 on Windows, Chrome 154 on Android, and Outlook
 *          desktop ("ms-office") loading the pixel
 * - bots:  Chrome 139 on Windows within seconds of delivery; an evening
 *          second wave from Chrome 124 on Linux followed minutes later by
 *          Chrome 149 on Windows, at many different companies; and
 *          python-requests clicking repeatedly over 20 minutes
 *
 * Real browsers keep themselves up to date; sandboxes don't. So the
 * strongest signals here are (1) the client isn't a browser at all,
 * (2) the browser is months out of date, (3) the same visitor (network
 * address, or exact browser) turning up at several different companies,
 * and (4) timing -- right after delivery, or right on the heels of a hit we
 * already know was automated.
 *
 * This deliberately errs toward calling things automated: a real
 * prospect's open being missed costs little, while a bot's click shown as
 * interest misleads. Nothing is discarded either way -- every event is
 * still logged with its verdict and reason, and only non-automated events
 * move a prospect's status or count in reports.
 */

// Known scanner / security-gateway / HTTP-library user-agents.
const SCANNER_UA_PATTERN =
  /bot|crawler|spider|scan|safelink|threatprotection|atp[-_]?probe|proofpoint|mimecast|barracuda|ips-agent|link[-_]?checker|preview|urlprotect|headless|phantomjs|python|curl|wget|go-http|java\/|okhttp|axios|node-fetch|undici|libwww|httpclient|aiohttp|scrapy/i;

// Timing: scans run as soon as the message lands. Measured generously from
// the send request (the relay chain adds minutes before delivery), and
// tightly from the confirmed send when that's known.
const AUTOMATED_WINDOW_FROM_DISPATCH_MS = 15 * 60_000;
const AUTOMATED_WINDOW_FROM_CONFIRMED_SEND_MS = 5 * 60_000;

// A scan comes in waves from several sandboxes: anything on the same email
// shortly after a hit already judged automated is the same scan (the
// evening wave's second visitor arrived 1-9 minutes after the first).
const FOLLOWS_AUTOMATED_MS = 15 * 60_000;
const DENSE_BURST_WINDOW_MS = 10_000;
const DENSE_BURST_MIN_PRIOR_EVENTS = 2;

// Cross-recipient: people at different companies never share a network
// address, and rarely the exact same browser build within the same couple
// of hours -- a scanning service does both.
const SAME_IP_WINDOW_MS = 12 * 60 * 60_000;
const SAME_IP_MIN_OTHER_DOMAINS = 1;
const SAME_UA_WINDOW_MS = 2 * 60 * 60_000;
const SAME_UA_MIN_OTHER_DOMAINS = 2;

// Chrome/Edge release roughly every 4 weeks and update themselves. Anchor:
// version 153 was current on 2026-09-22 (the owner's own Edge in the data).
// A browser this many versions behind is a frozen sandbox, not a person
// (enterprise "extended stable" channels lag by at most ~2).
const CHROMIUM_ANCHOR_VERSION = 153;
const CHROMIUM_ANCHOR_DATE = Date.UTC(2026, 8, 22);
const CHROMIUM_RELEASE_MS = 28 * 24 * 60 * 60_000;
const CHROMIUM_MAX_VERSIONS_BEHIND = 3;

export const DETECTION_WINDOW_MS = Math.max(SAME_IP_WINDOW_MS, SAME_UA_WINDOW_MS, FOLLOWS_AUTOMATED_MS);

export interface EventClassification {
  automated: boolean;
  reason?: string;
}

export interface PriorTrackingEvent {
  occurredAt: Date;
  automated: boolean;
}

/** An open/click on any message in the campaign, for cross-recipient checks. */
export interface CrossRecipientEvent {
  occurredAt: Date;
  userAgent?: string;
  ip?: string;
  /** Email domain of the prospect the message went to. */
  recipientDomain: string;
}

/** Expected current Chromium major version at a given moment. */
export function expectedChromiumVersion(at: Date): number {
  const elapsed = at.getTime() - CHROMIUM_ANCHOR_DATE;
  return CHROMIUM_ANCHOR_VERSION + Math.floor(elapsed / CHROMIUM_RELEASE_MS);
}

/** Chrome/Edge major version from a user-agent, or null if it isn't Chromium. */
export function chromiumVersion(userAgent: string): number | null {
  const match = /(?:Chrome|Edg|CriOS|EdgiOS)\/(\d+)\./.exec(userAgent);
  return match ? Number(match[1]) : null;
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@").pop() ?? "";
}

/** Client network address from proxy headers (Render puts the client first). */
export function clientIp(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip")?.trim() || undefined;
}

function distinctOtherDomains(events: CrossRecipientEvent[], ownDomain: string): number {
  return new Set(events.map((e) => e.recipientDomain).filter((d) => d && d !== ownDomain)).size;
}

export function classifyTrackingEvent(params: {
  /** When the send request was queued (OutreachMessage.createdAt). Always set. */
  dispatchedAt: Date;
  /** OutreachMessage.sentAt once confirmed; often still null when a scanner hits. */
  confirmedSentAt?: Date | null;
  occurredAt: Date;
  userAgent?: string;
  ip?: string;
  /** Email domain of the prospect this message went to. */
  recipientDomain?: string;
  /** Earlier open/click events on the same message. */
  priorEvents?: PriorTrackingEvent[];
  /** Recent open/click events on other prospects' messages. */
  crossRecipientEvents?: CrossRecipientEvent[];
}): EventClassification {
  const {
    dispatchedAt,
    confirmedSentAt,
    occurredAt,
    userAgent,
    ip,
    recipientDomain = "",
    priorEvents = [],
    crossRecipientEvents = [],
  } = params;
  const at = occurredAt.getTime();
  const ua = (userAgent ?? "").trim();

  // 1. Not a browser or mail client at all.
  if (!ua) {
    return { automated: true, reason: "no user-agent -- not a browser or mail client" };
  }
  if (SCANNER_UA_PATTERN.test(ua) || !/^Mozilla\//.test(ua)) {
    return { automated: true, reason: `user-agent is a scanner or script, not a browser (${ua.slice(0, 60)})` };
  }

  // 2. A browser months out of date: a frozen sandbox.
  const version = chromiumVersion(ua);
  if (version !== null) {
    const behind = expectedChromiumVersion(occurredAt) - version;
    if (behind > CHROMIUM_MAX_VERSIONS_BEHIND) {
      return {
        automated: true,
        reason: `browser is Chrome ${version}, ${behind} versions out of date -- a security sandbox, not a person's browser`,
      };
    }
  }

  // 3. Right after delivery.
  const sinceDispatchMs = at - dispatchedAt.getTime();
  if (sinceDispatchMs >= 0 && sinceDispatchMs < AUTOMATED_WINDOW_FROM_DISPATCH_MS) {
    return {
      automated: true,
      reason: `occurred ${Math.round(sinceDispatchMs / 1000)}s after send -- consistent with automated link-scanning on delivery`,
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

  // 4. Same visitor at other companies.
  if (ip) {
    const sameIp = crossRecipientEvents.filter(
      (e) => e.ip === ip && Math.abs(at - e.occurredAt.getTime()) < SAME_IP_WINDOW_MS
    );
    const others = distinctOtherDomains(sameIp, recipientDomain);
    if (others >= SAME_IP_MIN_OTHER_DOMAINS) {
      return { automated: true, reason: `same network address also hit links sent to ${others} other compan${others === 1 ? "y" : "ies"}` };
    }
  }
  if (/(Chrome|Firefox|Safari)\//.test(ua)) {
    const sameUa = crossRecipientEvents.filter(
      (e) => e.userAgent === ua && Math.abs(at - e.occurredAt.getTime()) < SAME_UA_WINDOW_MS
    );
    const others = distinctOtherDomains(sameUa, recipientDomain);
    if (others >= SAME_UA_MIN_OTHER_DOMAINS) {
      return { automated: true, reason: `identical browser also hit links sent to ${others} other companies within 2 hours` };
    }
  }

  // 5. Riding on a scan already in progress on this email.
  const before = priorEvents.filter((e) => e.occurredAt.getTime() <= at);
  if (before.some((e) => e.automated && at - e.occurredAt.getTime() < FOLLOWS_AUTOMATED_MS)) {
    return { automated: true, reason: "arrived within 15 minutes of an automated scan of this email" };
  }
  const dense = before.filter((e) => at - e.occurredAt.getTime() < DENSE_BURST_WINDOW_MS).length;
  if (dense >= DENSE_BURST_MIN_PRIOR_EVENTS) {
    return { automated: true, reason: `${dense + 1} hits within ${DENSE_BURST_WINDOW_MS / 1000}s -- consistent with automated scanning` };
  }

  return { automated: false };
}
