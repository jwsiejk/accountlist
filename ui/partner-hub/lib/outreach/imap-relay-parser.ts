/**
 * Parses the relay notifications that Power Automate sends to the Gmail
 * relay mailbox (SC26_IMAP_USER). Two flows land here now, distinguished by
 * subject (see imap-poller.ts):
 *
 * 1. A reply landing in the watched DDN inbox -- see parseRelayNotification.
 * 2. The send-flow confirming it actually dispatched a queued outreach
 *    email -- see parseSendConfirmation.
 *
 * Expected body shape for a reply (case-insensitive labels, one per line):
 *
 *   FROM: prospect@example.com
 *   SUBJECT: RE: DDN at Supercomputing 2026 (SC26) -- let's connect in Chicago
 *   RECEIVED: 2026-09-18T14:32:00Z
 *
 *   <original message body / dynamic content, optional>
 *
 * This is an assumption about the "Send an email (V2)" body template, not
 * something read from the real flow -- if Power Automate's dynamic
 * content renders differently (e.g. "Name <email>" for From, or a
 * different date format), confirm/adjust this against the real relay
 * emails landing in the mailbox. Only FROM is required to resolve a match;
 * SUBJECT/RECEIVED are captured as best-effort context for TrackingEvent.meta
 * so a formatting mismatch there doesn't block reply detection.
 */

export interface ParsedRelayNotification {
  /** Lowercased, trimmed email address of the person who replied. */
  fromEmail: string;
  /** Display name from "Name <email>", if present. */
  fromName: string | null;
  subject: string | null;
  receivedAt: Date | null;
}

export interface ParsedSendConfirmation {
  /** The OutreachMessage.trackingToken echoed back by the send-flow. */
  token: string;
  confirmedAt: Date | null;
}

const ANGLE_EMAIL = /<\s*([^<>\s]+@[^<>\s]+)\s*>/;
const BARE_EMAIL = /([^\s<>",;]+@[^\s<>",;]+)/;

/**
 * Splits a plain-text body into its labeled fields (FROM/SUBJECT/RECEIVED,
 * or TOKEN/CONFIRMED_AT -- whatever the caller asks for), case-insensitive,
 * tolerant of extra spacing, CRLF or LF line endings. First occurrence of a
 * given label wins, so a label reappearing further down the body (e.g.
 * inside an inline-quoted original message) can't override the real one
 * above it.
 */
function parseLabeledFields<K extends string>(bodyText: string, keys: readonly K[]): Partial<Record<K, string>> {
  const pattern = new RegExp(`^[ \\t]*(${keys.join("|")})[ \\t]*:[ \\t]*(.*)$`, "i");
  const fields: Partial<Record<K, string>> = {};

  for (const line of bodyText.split(/\r?\n/)) {
    const match = line.match(pattern);
    if (!match) continue;
    // Normalize back to the caller's exact casing for the key (the regex
    // itself matched case-insensitively) rather than assuming uppercase.
    const key = keys.find((k) => k.toLowerCase() === match[1].toLowerCase()) as K;
    if (fields[key] === undefined) {
      fields[key] = match[2].trim();
    }
  }
  return fields;
}

export function parseRelayNotification(bodyText: string | null | undefined): ParsedRelayNotification | null {
  if (!bodyText) return null;

  const fields = parseLabeledFields(bodyText, ["FROM", "SUBJECT", "RECEIVED"] as const);

  const rawFrom = fields.FROM;
  if (!rawFrom) return null;

  const { email, name } = extractEmail(rawFrom);
  if (!email) return null;

  return {
    fromEmail: email.toLowerCase(),
    fromName: name,
    subject: fields.SUBJECT ?? null,
    receivedAt: fields.RECEIVED ? parseFlexibleDate(fields.RECEIVED) : null,
  };
}

/**
 * Expected body shape for a send-confirmation (see relay-send.ts for the
 * matching send-request format this responds to):
 *
 *   TOKEN: <the OutreachMessage.trackingToken from the send-request>
 *   CONFIRMED_AT: 2026-09-18T14:32:00Z
 *
 * Only TOKEN is required to resolve a match -- CONFIRMED_AT is best-effort
 * context, same reasoning as RECEIVED above. This is also an assumption
 * about the send-flow's own "Send an email (V2)" body, since that flow
 * doesn't exist yet -- build it to match this, or tell me how it actually
 * renders and I'll adjust the parser.
 */
export function parseSendConfirmation(bodyText: string | null | undefined): ParsedSendConfirmation | null {
  if (!bodyText) return null;

  const fields = parseLabeledFields(bodyText, ["TOKEN", "CONFIRMED_AT"] as const);

  const token = fields.TOKEN?.trim();
  if (!token) return null;

  return {
    token,
    confirmedAt: fields.CONFIRMED_AT ? parseFlexibleDate(fields.CONFIRMED_AT) : null,
  };
}

function extractEmail(value: string): { email: string | null; name: string | null } {
  const angled = value.match(ANGLE_EMAIL);
  if (angled && typeof angled.index === "number") {
    const name = value.slice(0, angled.index).trim().replace(/^["']|["']$/g, "") || null;
    return { email: angled[1], name };
  }
  const bare = value.match(BARE_EMAIL);
  return { email: bare ? bare[1] : null, name: null };
}

function parseFlexibleDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Very small HTML -> text fallback for the rare case the relay email has no
 * text/plain part (mailparser only populates `.text` when one exists).
 * Deliberately minimal: this only ever runs against our own automated
 * relay's output, not arbitrary third-party HTML.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
