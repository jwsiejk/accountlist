# Outreach module — setup

This module lives inside Portfolio Hub (`ui/partner-hub`) as a route (`/outreach`) and API
namespace (`/api/outreach/*`). It's off by default behind `NEXT_PUBLIC_ENABLE_SC26_OUTREACH`
(the env var name predates the module covering more than one campaign — kept as-is so turning
it on doesn't require adding a second Render env var).

It supports any number of **campaigns**, each with its own prospect list and its own email
templates (created and edited from the dashboard itself, not files in this repo). A template's
HTML body can be typed directly, or imported from an `.html`/`.htm`/`.txt` file (the "Import
HTML" / "Import file…" buttons on the Templates tab) so a template someone already has as a
file doesn't need to be retyped or pasted by hand. All campaigns share one send/reply
infrastructure: one relay mailbox, one Power Automate send-flow, one Power Automate reply-relay
flow, and one IMAP poller.

**There is no Microsoft Graph API access anywhere in this module.** An earlier version of this
setup guide described registering an Azure AD app and Graph mail subscriptions — that approach
was abandoned (no admin consent available for the DDN tenant) in favor of the chain below, and
that code has been removed. If you find an old copy of this doc describing Azure AD app
registration, ignore it.

## Batches and the email sequence

Within a campaign, contacts are organised into **batches** — one per round of outreach
(Campaign → Batch → contacts). Each contact is also tracked through a three-email **sequence**
(Email 1 → Email 2 → Email 3). Both live on the campaign's **Batches** tab; the **Report** tab
shows the same data as a shareable summary.

- **Importing.** Uploading a CSV asks which batch to put the contacts in: a new one (named, or
  auto-named "Batch N") or an existing one. A contact whose email is already in the campaign
  keeps its current batch (and is only adopted into the target batch if it had none).
- **Sequence progress is derived, not stored.** Each `OutreachMessage` records the `step` it was
  sent as (1–3); a contact's state per email (sent / queued / ready / due-on-date / waiting /
  stopped) is computed from those rows by `lib/outreach/sequence.ts`. The send route enforces the
  rules server-side: Email 2 only after Email 1 has been sent, never the same email twice, and
  nothing further to a contact who replied or bounced.
- **Timing is a suggestion.** Each campaign has a suggested gap (default 3 days after Email 1 for
  Email 2, 4 days after Email 2 for Email 3), used only to show "Due Oct 4" / "Ready". Nothing
  sends automatically — you pick the contacts and click send. Sending early is allowed.
- **Templates.** A template can be tagged as Email 1, 2 or 3; choosing which email to send picks
  the tagged template automatically (it can still be edited in the review step).
- **A send request that is never confirmed** by the send-flow within an hour stops blocking its
  step, and the cell shows "Retry — not confirmed", so a failed relay doesn't strand a contact.
- **Views by health.** The Batches tab splits contacts into *Needs attention* (a send was
  requested but never confirmed or seen to arrive), *Sending now*, *Sent — all good*, and *Not
  started*, so troubleshooting never mixes with contacts that are fine. Selecting, "select all"
  and row actions only ever apply to the view on screen. It opens on *Needs attention* when
  anything is in it.
- **Duplicate-send protection.** Whether an email went out is decided from the history, never the
  status label: a confirmation, a hand-marked send, or any open/click (even an automated scan --
  only a delivered email can be scanned) all lock that email for that contact. A recorded reply
  or bounce stops the sequence even if "Reset to Pending" is clicked. Resending to a contact whose
  earlier request was never confirmed requires ticking "I checked Sent Items"; if it *is* in Sent
  Items, use **Mark as sent** instead.
- **Paced sending.** The dashboard sends 5 contacts per request with a 30-second pause between
  requests (the send route rejects more than 5 at once). On Oct 1 the Power Automate send-flow
  completed only ~15 of 74 requests queued in the same second.
- **Moving contacts** between batches only changes the contact's batch: their messages, tracking
  events and sequence progress travel with them. Deleting a batch leaves its contacts in the
  campaign as "Unassigned" (nothing is deleted).
- **Removing contacts** deletes them for good (their message history and tracking go with them).
  They can be imported again later and start from Email 1. A confirmation or reply that arrives
  afterwards for a removed contact matches nobody and is counted as unmatched by the IMAP poller.
- **Report.** `GET /api/outreach/report?campaignId=…` returns a CSV (one row per contact, grouped
  by batch: when each email was sent, opened/clicked/replied/bounced, next email due); add
  `&batchId=…` for one batch, `&format=text` for a plain-text summary to paste into an email, and
  `&tz=America/New_York` to choose the time zone for the timestamps (the dashboard passes the
  browser's). Opens and clicks exclude suspected automated link-scanners, as elsewhere.

The migration that adds this (`20261001130000_outreach_batches_and_sequence`) is purely additive:
existing campaigns, prospects, messages and events are kept, each campaign's existing prospects
are placed in a "Batch 1", and existing messages count as Email 1.

## How a send actually happens

There's no direct SMTP/Graph send from this app to a real prospect. Instead:

1. The dashboard calls `POST /api/outreach/send`, which emails a "send request" (via the
   [Resend](https://resend.com) API) to a Gmail mailbox (`SC26_IMAP_USER`) used purely as an
   internal relay — a real prospect never sees this message.
2. A Power Automate flow, triggered by that Gmail message landing in the relay mailbox, extracts
   the token/recipient/subject/HTML and sends the actual outreach email from the real DDN
   mailbox (`SC26_MAILBOX`) via its own already-authorized Outlook connector.
3. That same flow emails a confirmation back to the Gmail relay mailbox once it's sent.
4. This app's IMAP poller (`pollImapForReplies()` in `lib/outreach/imap-poller.ts`) periodically
   checks the relay mailbox, matches that confirmation back to the `OutreachMessage` by its
   tracking token, and flips the prospect's status from `SENDING` to `SENT`.

A **separate** Power Automate flow watches the real DDN mailbox for prospect replies and relays
them (as a different kind of notification email) to the same Gmail relay mailbox, which the same
IMAP poller also picks up and matches to a prospect by email address, logging a `REPLIED` event.

Opens and booking-link clicks don't go through any of this — they're plain HTTP requests to
`/api/outreach/track/open/[token]` and `/api/outreach/track/click/[token]` embedded in the
outreach email itself.

## ⚠️ Known limitation for a new campaign: the reply-relay trigger

The Power Automate flow that relays replies out of the real DDN inbox (step "a separate flow"
above) currently triggers on **`contains(Subject, 'SC26')`**. A reply to a campaign whose email
subject doesn't contain "SC26" will not be relayed, and so will never be detected as a reply —
the prospect will just sit at whatever status they were last at.

This can't be fixed from this repo; it's configuration inside that Power Automate flow, which
this app has no API access to. Before running a second campaign that expects reply tracking to
work, either:

- broaden that flow's trigger condition (e.g. to something that matches every campaign's
  outreach, such as a fixed marker every template's subject is made to include), or
- accept that replies to non-SC26-subject campaigns won't be tracked until that's done.

Sends, opens, clicks, and send-confirmations are unaffected by this — only reply detection goes
through that particular flow.

## One-time setup

1. **Gmail relay mailbox.** Create (or pick) a Gmail account to act as the relay. Enable IMAP
   access and generate an [app password](https://myaccount.google.com/apppasswords) for it (not
   the account's real password — 2-Step Verification must be on to generate one).
2. **Resend account.** Sign up at [resend.com](https://resend.com) using the *same* address as
   the Gmail relay mailbox — Resend's shared test sender (`onboarding@resend.dev`, no domain
   verification needed) can only mail the account's own address, and the relay mailbox is always
   the recipient of this particular email, so that sidesteps needing to verify a sending domain.
   Grab an API key from the dashboard.
3. **Power Automate send-flow**, triggered by a new email arriving in the Gmail relay mailbox
   with subject `OUTREACH-SEND-REQUEST` (see `SEND_REQUEST_SUBJECT` in `lib/outreach/relay-send.ts`).
   It needs to: extract the token/to/subject/HTML fields (delimited by HTML comment markers —
   see `SEND_REQUEST_MARKERS` in the same file for the exact strings and how to extract them),
   send that as a real email from `SC26_MAILBOX` via the Outlook connector, then send a
   confirmation email back to the Gmail relay mailbox whose subject contains `SEND-CONFIRMED`
   (see `SEND_CONFIRMED_SUBJECT_MARKER`) and whose body echoes the same token back (see
   `imap-relay-parser.ts`'s `parseSendConfirmation` for the exact expected shape). **Include a
   `CONFIRMED_AT: <the flow's own UTC timestamp>` line in that body** — without it, this app has
   no way to know when the send actually happened and falls back to whenever the IMAP poller
   next happens to notice the confirmation (up to a few minutes later), which can make an
   automated link-scan/open — logged live, the instant it happens — appear in a prospect's
   history *before* the message's own "Sent" entry. Confusing but harmless (it doesn't affect
   status or tracking), and fixed simply by adding that line to the flow.
4. **Power Automate reply-relay flow**, triggered by a new email in the real DDN mailbox's
   inbox matching the trigger condition described in the limitation above. It relays a
   notification (From/Subject/Received-at) to the Gmail relay mailbox — see
   `imap-relay-parser.ts`'s `parseRelayNotification` for the exact expected body shape. Same
   note as above: include a real `RECEIVED:` timestamp in that body so a reply's history entry
   is ordered by when it actually arrived, not by poll timing.
5. **Env vars** (see `.env.local.example` for the full list with explanations):
   `SC26_MAILBOX`, `SC26_SENDER_NAME`, `SC26_IMAP_HOST`/`PORT`/`USER`/`APP_PASSWORD`,
   `SC26_BOOKING_URL`, `RESEND_API_KEY`, `TRACKING_TOKEN_SECRET`, `CRON_SECRET`, `APP_BASE_URL`,
   and `NEXT_PUBLIC_ENABLE_SC26_OUTREACH=true`.
6. **Scheduled IMAP poll.** Nothing calls `POST /api/outreach/imap-poll` on its own — it's
   wired up as a GitHub Actions scheduled workflow
   (`.github/workflows/outreach-imap-poll.yml`, every 5 minutes). That workflow needs a repo
   secret `SC26_OUTREACH_CRON_SECRET` matching the `CRON_SECRET` env var set on Render.
   GitHub treats that schedule as best-effort and in practice has run it hours apart, so each
   run keeps calling the endpoint until the response no longer says `truncated: true`, and each
   call drains as much of the relay inbox as fits in ~15 seconds (skipping this app's own
   `OUTREACH-SEND-REQUEST` mail without parsing it). If confirmations still lag, point an
   external scheduler (a Render Cron Job or cron-job.org) at the same endpoint with the same
   bearer token, or click "Run workflow" on the workflow's Actions page to drain on demand.

Once deployed with `NEXT_PUBLIC_ENABLE_SC26_OUTREACH=true`, the **Outreach** link appears in the
left nav. Create a campaign, add a template, import a CSV of prospects, and send.

## Opens and clicks: filtering automated scans

Security gateways at recipient companies open the tracking pixel and click every link, both on
delivery and again hours later. `lib/outreach/eventClassification.ts` flags a hit as automated
when any of these hold (details and production examples in that file):

- the client isn't a browser or mail client (python-requests, curl, no user-agent, ...)
- the browser is a Chrome/Edge build more than 3 versions out of date (sandboxes don't update)
- it's within 15 minutes of the send (5 of the confirmed send)
- the same network address hit links sent to another company, or the identical browser hit
  links sent to 2+ other companies within 2 hours
- it's within 15 minutes of an automated hit on the same email, or one of 3+ hits in 10 seconds

Automated hits are kept in the history (marked "automated scan, not counted") but never move a
prospect's status or count in reports. Network addresses are recorded from Oct 2026 on.

To apply new rules to existing history, run the **Outreach reclassify tracking** workflow from
the Actions tab — first with "dry run" ticked to see what would change, then without.

Even filtered, opens and clicks are a hint, not proof of interest; replies and booked meetings
are the reliable signals.

## Known limitations

- **No per-app-user auth.** Anyone who can reach the deployed URL can use this module — there's
  no login of its own yet.
- **One shared relay mailbox and sender identity for every campaign.** Campaigns separate
  prospects and templates, not the underlying send/reply infrastructure or the "From" address.
- **Sending limits** are whatever the real DDN mailbox's normal Exchange/Outlook sending limits
  allow — this app has no visibility into or control over that.
