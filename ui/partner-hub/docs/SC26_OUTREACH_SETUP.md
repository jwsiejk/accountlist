# SC26 Outreach — setup

This module lives inside Portfolio Hub (`ui/partner-hub`) as a new route (`/sc26-outreach`)
and API namespace (`/api/sc26-outreach/*`). It's off by default behind
`NEXT_PUBLIC_ENABLE_SC26_OUTREACH`. Everything below is a one-time setup you need to do —
none of it can be done from the app itself.

## 1. Register an Azure AD (Entra ID) app

This is what lets the app send mail as a real DDN Outlook mailbox and read that mailbox's
Inbox to detect replies. It needs sign-off from whoever administers your Entra ID tenant —
this is a real permission grant against company mail, not a self-serve API key.

1. In the [Azure Portal](https://portal.azure.com) → **Entra ID → App registrations → New registration**.
   Name it something identifiable, e.g. `ddn-sc26-outreach`.
2. Under **Certificates & secrets**, create a new client secret. Copy the *value* immediately —
   it's only shown once. This becomes `AZURE_CLIENT_SECRET`.
3. Note the **Application (client) ID** (`AZURE_CLIENT_ID`) and **Directory (tenant) ID**
   (`AZURE_TENANT_ID`) from the app's Overview page.
4. Under **API permissions → Add a permission → Microsoft Graph → Application permissions**,
   add:
   - `Mail.ReadWrite` — needed to create the draft message before sending (the app sends via a
     create-draft-then-send flow specifically so it gets back a message id / conversation id
     to match replies against later — the simpler `sendMail` endpoint doesn't return one).
   - `Mail.Send` — needed to actually send the draft.
   Then click **Grant admin consent** — this step requires a tenant admin.

**Important:** application permissions like these apply to *every* mailbox in the tenant by
default. Do not skip step 2 below — without it, this app registration could send or read mail
as anyone in the company, which is far more access than this needs.

## 2. Restrict the app to one mailbox

Run this in [Exchange Online PowerShell](https://learn.microsoft.com/en-us/powershell/exchange/connect-to-exchange-online-powershell)
(requires an Exchange admin):

```powershell
Connect-ExchangeOnline

New-ApplicationAccessPolicy `
  -AppId "<AZURE_CLIENT_ID>" `
  -PolicyScopeGroupId "sc26@ddn.com" `
  -AccessRight RestrictAccess `
  -Description "SC26 outreach app - restricted to sc26 mailbox only"
```

`PolicyScopeGroupId` can be a single mailbox's email address directly, or a mail-enabled
security group containing just that mailbox if you'd rather manage it that way. Verify it
worked with `Test-ApplicationAccessPolicy -AppId "<AZURE_CLIENT_ID>" -Identity "sc26@ddn.com"`.

## 3. Decide on the sending mailbox

Set `SC26_MAILBOX` to whichever address this sends from and monitors for replies — either a
shared mailbox created for this (e.g. `sc26@ddn.com`, recommended: keeps outreach replies out
of a personal inbox and makes this easy to hand off) or an individual rep's own mailbox. Set
`SC26_SENDER_NAME` to how you want the "Best," signature to read.

## 4. Deploy to Render

1. Push this repo (or just this branch) to GitHub, then in Render: **New → Web Service →**
   connect the repo, root directory `ui/partner-hub`.
2. Build command: `npm install && npm run build`. Start command: `npm run start`.
3. Add a **persistent disk** (Render dashboard → the service → Disks) mounted somewhere like
   `/data`, and set `DATABASE_URL=file:/data/sc26.db` — SQLite needs a real disk under Render,
   not the ephemeral container filesystem, or your data disappears on every deploy/restart.
4. Set every env var from `.env.local.example`'s SC26 section:
   - `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` (from step 1)
   - `SC26_MAILBOX`, `SC26_SENDER_NAME`
   - `APP_BASE_URL` — the real `https://...` URL this service is reachable at once deployed
     (Render gives you a `*.onrender.com` URL immediately; switch this to a custom subdomain
     once DNS is set up, see step 6)
   - `SC26_BOOKING_URL` (defaults to the real DDN booking page if unset)
   - `TRACKING_TOKEN_SECRET`, `GRAPH_WEBHOOK_CLIENT_STATE`, `CRON_SECRET` — generate each with
     `openssl rand -hex 32`
   - `NEXT_PUBLIC_ENABLE_SC26_OUTREACH=true`

## 5. Set up the reply-subscription renewal cron

Microsoft Graph mail subscriptions expire in under 3 days, so `/api/sc26-outreach/graph/subscribe`
needs to be hit on a recurring schedule to create/renew it — it does nothing harmful if called
more often than needed, so daily is a safe cadence.

In Render: **New → Cron Job**, same repo, and set it to run (once a day is plenty):

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-app-url>/api/sc26-outreach/graph/subscribe
```

Give the cron job its own `CRON_SECRET` env var matching the web service's.

## 6. Optional: a real subdomain instead of `*.onrender.com`

Recipients trust a link under `ddn.com` far more than a random Render URL, and some corporate
mail filters treat generic hosting subdomains with more suspicion. In Render, add a custom
domain (e.g. `track.ddn.com`) to the web service, then add the CNAME record Render gives you
in DDN's DNS. Update `APP_BASE_URL` to match once it's live, since that value is baked into
every tracking pixel/click URL at send time.

## 7. Turn it on

Set `NEXT_PUBLIC_ENABLE_SC26_OUTREACH=true` and redeploy. The **SC26 Outreach** link appears
in the left nav. Upload a CSV (`email`, `first_name` required; `last_name`, `company`, `title`
optional) and send.

## A few things worth knowing going in

- **This makes the whole app public.** Portfolio Hub has no login today. Deploying it to Render
  puts every route — including your other personal tools — on the public internet, not just
  this module. Worth adding at least basic auth (e.g. Render's built-in basic auth, or a simple
  middleware check) before this goes live with real prospect data flowing through it.
- **Sending limits.** App-only Graph sends are still bound by the mailbox's normal Exchange
  Online sending limits (roughly 10,000 recipients/day, 30 messages/minute for standard
  licenses) — comfortably enough for this list, just don't loop it into something much bigger
  without checking.
- **Bounces** aren't handled by this MVP — a hard bounce currently just looks like "no reply."
  If bounce visibility matters, the reply webhook can be extended to also watch for delivery
  failure reports, which show up in the same Inbox.
