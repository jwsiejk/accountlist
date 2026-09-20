/**
 * Dispatches the "send request" that the outbound Power Automate flow picks
 * up and forwards to the prospect from jsiejk@ddn.com.
 *
 * Sent to the Gmail relay mailbox (SC26_IMAP_USER) via the Resend API
 * (https://resend.com), NOT to SC26_MAILBOX directly. An earlier version
 * sent it straight to the DDN mailbox, which got silently bounced by DDN's
 * corporate spam filtering (rejects mail from unrecognized external
 * senders) -- unrelated to Resend, unrelated to Gmail, just a corporate
 * mail server distrusting a brand-new sender. Gmail has no such filter, and
 * the Power Automate send-flow's trigger is a Gmail trigger watching this
 * same inbox (see SC26_OUTREACH_SETUP.md), so this never has to cross into
 * ddn.com at all until the flow itself sends the real outreach email via
 * its own already-authenticated Outlook connector.
 *
 * Also unrelated to the earlier Gmail *SMTP* WebLoginRequired error -- this
 * is Resend's API sending TO Gmail, not this app logging into Gmail's SMTP
 * server, so that account-trust issue doesn't apply here either.
 *
 * This mail never reaches a real prospect -- it's purely an internal signal
 * to wake up the Power Automate flow, which is the thing that actually
 * emails the prospect (via the Outlook connector, from SC26_MAILBOX) and
 * carries the tracking pixel / booking link. Swapping this transport
 * changes nothing about tracking, replies, or the prospect-facing email.
 *
 * Carries the FULLY RENDERED subject/HTML through the relay (not just
 * per-prospect merge fields) -- because the dashboard lets a person pick a
 * template from the repo's library and edit it before sending (see
 * templates/, merge.ts, and send/route.ts), the content is only known at
 * send time and can differ from anything Power Automate could hold itself.
 *
 * Sent as an HTML email (Resend's `html` field), not plain text -- this
 * matters. A plain-text message gets silently converted to a synthetic
 * HTML representation by Exchange/Outlook before Power Automate's trigger
 * ever sees it, and that conversion HTML-escapes the message ("<div>"
 * becomes "&lt;div&gt;"). Since the payload embeds a real HTML email
 * verbatim, that escaping would corrupt it. Sending it as HTML from the
 * start means the content type already matches what Exchange stores, so
 * nothing re-encodes it.
 *
 * The envelope uses HTML-comment markers (see SEND_REQUEST_MARKERS) rather
 * than labeled lines like "TOKEN: ...", specifically so extraction in Power
 * Automate doesn't depend on where line breaks land -- comments are inert
 * and Exchange doesn't rewrite them, so a plain indexOf/substring on the
 * raw Body string finds them reliably regardless of any reformatting.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export interface SendRequestInput {
  /** OutreachMessage.trackingToken -- echoed back in the confirmation to match. */
  token: string;
  toEmail: string;
  /** Final, already-merged subject (no {{PLACEHOLDER}} tokens left). */
  subject: string;
  /** Final, already-merged HTML (no {{PLACEHOLDER}} tokens left). */
  html: string;
}

/** Distinct from anything containing "SC26" on purpose -- see docs/SC26_OUTREACH_SETUP.md
 *  for why: the existing reply-detection flow's trigger condition is
 *  `contains(Subject, 'SC26')` against the same DDN inbox this lands in, and this subject
 *  must not accidentally match it too, or every send would also get relayed as a fake reply. */
const SEND_REQUEST_SUBJECT = "OUTREACH-SEND-REQUEST";

/**
 * Subject marker the Power Automate send-flow's confirmation email must
 * contain when it lands back in the Gmail relay mailbox (the same inbox
 * imap-poller.ts already polls for replies). imap-poller.ts checks each
 * relay message's own subject for this marker to decide whether to parse it
 * as parseSendConfirmation (this) or parseRelayNotification (a reply) --
 * the two shapes aren't self-distinguishing (a reply could technically
 * contain a line starting "TOKEN:"), so routing has to happen on the
 * envelope subject, not the body content.
 *
 * Exported (not just documented) so the send-flow spec and the poller stay
 * byte-for-byte in sync on the exact string to match against.
 */
export const SEND_CONFIRMED_SUBJECT_MARKER = "SEND-CONFIRMED";

/**
 * HTML-comment start/end marker pairs delimiting each field in the
 * send-request email's body. In the Power Automate flow, extract a field
 * with (for a marker pair { start, end }):
 *
 *   substring(
 *     triggerBody()?['body'],
 *     add(indexOf(triggerBody()?['body'], '<start>'), length('<start>')),
 *     sub(
 *       indexOf(triggerBody()?['body'], '<end>'),
 *       add(indexOf(triggerBody()?['body'], '<start>'), length('<start>'))
 *     )
 *   )
 *
 * Exported so the send-flow spec and this file agree on the exact strings
 * byte for byte.
 */
export const SEND_REQUEST_MARKERS = {
  TOKEN: { start: "<!--SC26:TOKEN-->", end: "<!--/SC26:TOKEN-->" },
  TO: { start: "<!--SC26:TO-->", end: "<!--/SC26:TO-->" },
  SUBJECT: { start: "<!--SC26:SUBJECT-->", end: "<!--/SC26:SUBJECT-->" },
  HTML: { start: "<!--SC26:HTML-->", end: "<!--/SC26:HTML-->" },
} as const;

/**
 * Resend's shared test sender. Works with no domain verification as long as
 * the recipient (SC26_IMAP_USER, the Gmail relay mailbox) is the same
 * address the Resend account was created with -- see
 * SC26_OUTREACH_SETUP.md. If that ever needs to be a different address than
 * the Resend account's own email, a verified sending domain would be
 * needed instead.
 */
const RESEND_FROM_ADDRESS = "SC26 Outreach <onboarding@resend.dev>";

export async function dispatchSendRequest(input: SendRequestInput): Promise<void> {
  const gmailRelayMailbox = requireEnv("SC26_IMAP_USER");
  const apiKey = requireEnv("RESEND_API_KEY");

  const { TOKEN, TO, SUBJECT, HTML } = SEND_REQUEST_MARKERS;
  const body = [
    `${TOKEN.start}${input.token}${TOKEN.end}`,
    `${TO.start}${input.toEmail}${TO.end}`,
    `${SUBJECT.start}${input.subject}${SUBJECT.end}`,
    HTML.start,
    input.html,
    HTML.end,
  ].join("\n");

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_ADDRESS,
        to: [gmailRelayMailbox],
        subject: SEND_REQUEST_SUBJECT,
        html: body,
      }),
    });
  } catch (err) {
    throw new Error(`Failed to reach Resend: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Throws on failure (auth, validation, Resend-side rejection) -- callers
  // don't catch this themselves, a failed dispatch should fail the send
  // request outright rather than silently leave a prospect stuck in SENDING.
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`Resend returned ${response.status} ${response.statusText}${bodyText ? `: ${bodyText.slice(0, 500)}` : ""}`);
  }
}
