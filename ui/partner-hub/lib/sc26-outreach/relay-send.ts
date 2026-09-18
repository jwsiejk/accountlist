import nodemailer from "nodemailer";

/**
 * Dispatches the "send request" that the new outbound Power Automate flow
 * picks up and turns into the actual outreach email from jsiejk@ddn.com.
 *
 * This deliberately does NOT send the outreach email itself, and does NOT
 * carry the rendered HTML template through the relay -- see send/route.ts
 * for why: Power Automate holds its own copy of the approved template, and
 * this just supplies the handful of fields that vary per prospect. sendMail
 * throwing here means the request never reached the relay inbox at all
 * (network/auth failure); it says nothing about whether Power Automate's
 * flow later succeeds, which is exactly the gap the confirmation
 * notification (imap-poller.ts + parseSendConfirmation) closes.
 *
 * Reuses the same Gmail account/app password as the IMAP poller (SMTP and
 * IMAP are separate protocols but one Gmail app password authorizes both)
 * rather than a second relay mailbox -- one less credential to manage.
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
  firstName: string;
  pixelUrl: string;
  clickUrl: string;
}

/** Distinct from anything containing "SC26" on purpose -- see docs/SC26_OUTREACH_SETUP.md
 *  (pending rewrite) for why: the existing reply-detection flow's trigger condition is
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

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SC26_SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SC26_SMTP_PORT || 465);
  const user = requireEnv("SC26_IMAP_USER");
  const pass = requireEnv("SC26_IMAP_APP_PASSWORD");

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

export async function dispatchSendRequest(input: SendRequestInput): Promise<void> {
  const user = requireEnv("SC26_IMAP_USER");
  const ddnMailbox = requireEnv("SC26_MAILBOX");
  const transporter = getTransporter();

  const body = [
    `TOKEN: ${input.token}`,
    `TO: ${input.toEmail}`,
    `FIRST_NAME: ${input.firstName}`,
    `PIXEL_URL: ${input.pixelUrl}`,
    `CLICK_URL: ${input.clickUrl}`,
  ].join("\n");

  // Throws on failure (network, auth, SMTP rejection) -- callers don't
  // catch this themselves, a failed dispatch should fail the send request
  // outright rather than silently leave a prospect stuck in SENDING.
  await transporter.sendMail({
    from: user,
    to: ddnMailbox,
    subject: SEND_REQUEST_SUBJECT,
    text: body,
  });
}
