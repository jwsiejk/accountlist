/**
 * Dispatches the "send request" that the outbound Power Automate flow picks
 * up and forwards to the prospect from jsiejk@ddn.com.
 *
 * This is a direct HTTP POST to that flow's own "When an HTTP request is
 * received" trigger URL -- no email, no SMTP, no Gmail account involved in
 * this step at all. (An earlier version of this file emailed a "send
 * request" to SC26_MAILBOX over Gmail SMTP purely to wake up the flow; that
 * fought Google's account-trust system for no real benefit, since nothing
 * about triggering a flow actually needs to go through email. Gmail is
 * still used elsewhere in this module -- see imap-poller.ts -- for the
 * reply-relay and the send-confirmation notification, both of which are
 * genuinely email-shaped and have nothing to do with this.)
 *
 * Carries the fully rendered subject/HTML (not just per-prospect merge
 * fields) as plain JSON fields -- because the dashboard lets a person pick a
 * template from the repo's library and edit it before sending (see
 * templates/, merge.ts, and send/route.ts), the content is only known at
 * send time. Power Automate's job is just "read token/toEmail/subject/html
 * off the request body and forward them into a Send-an-email step" -- no
 * text-envelope parsing needed, since JSON already keeps the fields apart.
 *
 * A non-2xx response (or a request that never completes) means the request
 * never reached the flow at all (network/URL/auth failure); it says nothing
 * about whether Power Automate's flow later succeeds in actually sending,
 * which is exactly the gap the confirmation notification (imap-poller.ts +
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
 * Sends the request as JSON POST body: { token, toEmail, subject, html }.
 * In the Power Automate flow, these arrive as ready-made properties of the
 * trigger's "Body" (via Power Automate's own automatic JSON schema parsing
 * of the request) -- reference them directly as dynamic content, no Compose
 * or substring/split expressions needed.
 */
export async function dispatchSendRequest(input: SendRequestInput): Promise<void> {
  const relayUrl = requireEnv("SC26_SEND_RELAY_URL");

  let response: Response;
  try {
    response = await fetch(relayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: input.token,
        toEmail: input.toEmail,
        subject: input.subject,
        html: input.html,
      }),
    });
  } catch (err) {
    // Network failure reaching the flow's HTTP trigger URL at all (DNS,
    // connectivity, etc). Re-thrown with context since fetch's own error
    // messages are often just "fetch failed" with no useful detail.
    throw new Error(`Failed to reach SC26_SEND_RELAY_URL: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `SC26_SEND_RELAY_URL returned ${response.status} ${response.statusText}${bodyText ? `: ${bodyText.slice(0, 500)}` : ""}`
    );
  }
}
