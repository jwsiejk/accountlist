/**
 * Thin wrapper around Microsoft Graph for the SC26 outreach module.
 *
 * Auth model: app-only (client credentials), using an Azure AD app
 * registration with the Mail.ReadWrite and Mail.Send *application*
 * permissions (Mail.ReadWrite covers both creating the draft below and
 * reading the Inbox for reply detection), scoped down to a single mailbox
 * via an Exchange Online Application Access
 * Policy (see SETUP.md). This avoids per-rep interactive OAuth for the MVP
 * (single connected mailbox) while keeping the app's effective access
 * limited to that one mailbox rather than "any mailbox in the tenant".
 *
 * Deliberately implemented against the plain OAuth2 client-credentials
 * token endpoint via fetch rather than the @azure/msal-node SDK -- it's a
 * single well-documented POST, and it keeps this module dependency-free
 * beyond what the app already ships with.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) {
    return cachedToken.value;
  }

  const tenantId = requireEnv("AZURE_TENANT_ID");
  const clientId = requireEnv("AZURE_CLIENT_ID");
  const clientSecret = requireEnv("AZURE_CLIENT_SECRET");

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to acquire Microsoft Graph access token: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function graphFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function graphJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await graphFetch(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Graph ${init.method ?? "GET"} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export interface SendTrackedMailInput {
  mailbox: string;
  toEmail: string;
  toName?: string;
  subject: string;
  html: string;
}

export interface SendTrackedMailResult {
  graphMessageId: string;
  graphConversationId: string | null;
}

/**
 * Sends a message via a two-step create-draft + send call instead of the
 * simpler POST /sendMail, specifically so we get back the message id and
 * conversationId immediately -- sendMail returns 202 with no body, which
 * leaves us with nothing to match replies against later.
 */
export async function sendTrackedMail(input: SendTrackedMailInput): Promise<SendTrackedMailResult> {
  const mailboxPath = `/users/${encodeURIComponent(input.mailbox)}`;

  const draft = await graphJson<{ id: string; conversationId?: string }>(
    `${mailboxPath}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        subject: input.subject,
        body: { contentType: "HTML", content: input.html },
        toRecipients: [
          {
            emailAddress: {
              address: input.toEmail,
              name: input.toName ?? undefined,
            },
          },
        ],
      }),
    }
  );

  await graphFetch(`${mailboxPath}/messages/${draft.id}/send`, { method: "POST" });

  return {
    graphMessageId: draft.id,
    graphConversationId: draft.conversationId ?? null,
  };
}

export interface GraphMessageSummary {
  id: string;
  conversationId: string | null;
  subject: string | null;
  receivedDateTime: string | null;
  from: { emailAddress?: { address?: string; name?: string } } | null;
}

export async function getMessage(mailbox: string, messageId: string): Promise<GraphMessageSummary> {
  const mailboxPath = `/users/${encodeURIComponent(mailbox)}`;
  return graphJson<GraphMessageSummary>(
    `${mailboxPath}/messages/${messageId}?$select=id,conversationId,subject,receivedDateTime,from`
  );
}

export interface SubscriptionResult {
  id: string;
  expirationDateTime: string;
}

/** Graph mail subscriptions cap out around 4230 minutes (~2.94 days). Renew well inside that. */
export function nextExpiration(): string {
  const expires = new Date(Date.now() + 4200 * 60_000);
  return expires.toISOString();
}

export async function createSubscription(params: {
  mailbox: string;
  notificationUrl: string;
  clientState: string;
}): Promise<SubscriptionResult> {
  return graphJson<SubscriptionResult>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      changeType: "created",
      notificationUrl: params.notificationUrl,
      resource: `/users/${encodeURIComponent(params.mailbox)}/mailFolders('Inbox')/messages`,
      expirationDateTime: nextExpiration(),
      clientState: params.clientState,
    }),
  });
}

export async function renewSubscription(subscriptionId: string): Promise<SubscriptionResult> {
  return graphJson<SubscriptionResult>(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({ expirationDateTime: nextExpiration() }),
  });
}
