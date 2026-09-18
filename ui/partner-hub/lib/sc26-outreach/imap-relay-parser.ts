/**
 * Parses the plain-text relay notification that Power Automate sends to the
 * Gmail relay mailbox (SC26_IMAP_USER) whenever a reply lands in the
 * watched DDN inbox.
 *
 * Expected body shape (case-insensitive labels, one per line):
 *
 *   FROM: prospect@example.com
 *   SUBJECT: RE: DDN at Supercomputing 2026 (SC26) -- let's connect in Chicago
 *   RECEIVED: 2026-09-18T14:32:00Z
 *
 *   <original message body / dynamic content, optional>
 *
 * This is an assumption about the "Send an email (V2)" body template, not
 * something read from the actual flow -- if Power Automate's dynamic
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

type FieldKey = "FROM" | "SUBJECT" | "RECEIVED";

const FIELD_LINE = /^[ \t]*(FROM|SUBJECT|RECEIVED)[ \t]*:[ \t]*(.*)$/i;

const ANGLE_EMAIL = /<\s*([^<>\s]+@[^<>\s]+)\s*>/;
const BARE_EMAIL = /([^\s<>",;]+@[^\s<>",;]+)/;

export function parseRelayNotification(bodyText: string | null | undefined): ParsedRelayNotification | null {
  if (!bodyText) return null;

  const fields: Partial<Record<FieldKey, string>> = {};
  for (const line of bodyText.split(/\r?\n/)) {
    const match = line.match(FIELD_LINE);
    if (!match) continue;
    const key = match[1].toUpperCase() as FieldKey;
    // First occurrence wins -- if the original message is quoted further
    // down the body (e.g. an inline reply chain), don't let a line inside
    // that quoted copy override the real relay header above it.
    if (fields[key] === undefined) {
      fields[key] = match[2].trim();
    }
  }

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
