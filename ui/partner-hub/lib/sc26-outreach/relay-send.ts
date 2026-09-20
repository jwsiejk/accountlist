/**
 * Dispatches the "send request" that the outbound Power Automate flow picks
 * up and forwards to the prospect from jsiejk@ddn.com.
 *
 * Sent via the Resend API (https://resend.com) rather than Gmail SMTP.
 * Gmail SMTP kept rejecting logins with a WebLoginRequired error tied to
 * Google's account-trust checks on a brand-new mailbox -- unrelated to
 * anything in this repo, and not something code can fix. Resend needs
 * nothing but an API key (no OAuth, no admin consent, no domain
 * verification as long as the recipient is the same address the Resend
 * account itself was created with -- see SC26_OUTREACH_SETUP.md).
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
 * Power Automate's job is reduced to "read this labeled plain-text
 * envelope, extract TO/SUBJECT, and forward everything after the HTML:
 * marker verbatim as the outgoing email's HTML body" -- see the
 * SEND_REQUEST_BODY_HTML_MARKER docstring below for the exact wire format
 * this depends on, and the send-flow spec for how to build that in the
 * Power Automate designer.
 *
 * Resend returning a non-2xx (or the request failing outright) means the
 * request never reached the relay inbox at all (network/auth failure); it
 * says nothing about whether Power Automate's flow later succeeds, which is
 * exactly the gap the confirmation notification (imap-poller.ts +
 * parseSendConfirmation) closes.
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
 * Marks where the labeled plain-text envelope (TOKEN/TO/SUBJECT) ends and
 * the literal HTML to forward begins, in the send-request email's body.
 * Sent as a *plain-text* email (Resend's `text` field, no `html`), so the
 * whole thing -- including the HTML markup after this marker -- is
 * delivered as-is, with no MIME re-rendering to fight. In the Power
 * Automate flow, extract this with a `substring`/`indexOf` expression on
 * the trigger's Body: everything after the first line that equals this
 * marker (skip its own newline) is the HTML to paste into the outgoing
 * "Send an email (V2)" step, switched to raw/code view so it isn't
 * re-escaped.
 *
 * Exported for the same reason as SEND_CONFIRMED_SUBJECT_MARKER: the
 * send-flow spec and this file must agree on the exact string byte for byte.
 */
export const SEND_REQUEST_BODY_HTML_MARKER = "HTML:";

/**
 * Resend's shared test sender. Works with no domain verification as long as
 * the recipient (SC26_MAILBOX) is the same address the Resend account was
 * created with -- see SC26_OUTREACH_SETUP.md. If SC26_MAILBOX ever needs to
 * be a different address than the Resend account's own email, a verified
 * sending domain would be needed instead.
 */
const RESEND_FROM_ADDRESS = "SC26 Outreach <onboarding@resend.dev>";

export async function dispatchSendRequest(input: SendRequestInput): Promise<void> {
  const ddnMailbox = requireEnv("SC26_MAILBOX");
  const apiKey = requireEnv("RESEND_API_KEY");

  // Single-line labeled fields first (mirrors the reply/confirmation wire
  // format so the same parsing style works throughout), then the HTML
  // marker, then the raw HTML itself with no further encoding -- this is a
  // plain-text email, so nothing downstream tries to interpret those tags.
  const body = [
    `TOKEN: ${input.token}`,
    `TO: ${input.toEmail}`,
    `SUBJECT: ${input.subject}`,
    SEND_REQUEST_BODY_HTML_MARKER,
    input.html,
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
        to: [ddnMailbox],
        subject: SEND_REQUEST_SUBJECT,
        text: body,
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
