import { NextResponse } from "next/server";

import { getMessage } from "@/lib/sc26-outreach/graph";
import { findMessageByConversationId, logEvent, markStatus } from "@/lib/sc26-outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GraphNotification {
  subscriptionId: string;
  clientState?: string;
  resourceData?: { id: string };
}

/**
 * Microsoft Graph change-notification endpoint for the monitored mailbox's
 * Inbox. Two request shapes hit this route:
 *
 * 1. Subscription validation: Graph calls with ?validationToken=... when a
 *    subscription is created or renewed and expects that exact token
 *    echoed back as plain text within ~10s.
 * 2. Change notifications: a POST body of { value: [...] } for each new
 *    message. We only care about matching replies to our own sent threads,
 *    so anything that doesn't match a known conversationId is ignored.
 *
 * NOTE: this MVP assumes a single monitored mailbox (SC26_MAILBOX) -- see
 * SETUP.md for how to extend this to multiple mailboxes.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const mailbox = process.env.SC26_MAILBOX;
  const clientState = process.env.GRAPH_WEBHOOK_CLIENT_STATE;
  const body = (await req.json().catch(() => null)) as { value?: GraphNotification[] } | null;

  if (mailbox && body?.value?.length) {
    for (const notification of body.value) {
      if (clientState && notification.clientState !== clientState) {
        continue; // Not authentic -- skip silently, don't leak details in the response.
      }
      const messageId = notification.resourceData?.id;
      if (!messageId) continue;

      try {
        const message = await getMessage(mailbox, messageId);
        if (!message.conversationId) continue;

        const match = await findMessageByConversationId(message.conversationId);
        if (!match) continue;

        // Skip if this is our own outbound copy landing in a folder we
        // watch for some reason (defensive; we only subscribe to Inbox).
        const fromAddress = message.from?.emailAddress?.address?.toLowerCase();
        if (fromAddress && fromAddress === mailbox.toLowerCase()) continue;

        await logEvent(match.id, "REPLY", { graphMessageId: messageId });
        await markStatus(match.prospectId, "REPLIED");
      } catch {
        // Best-effort: a single bad notification shouldn't fail the batch.
        continue;
      }
    }
  }

  // Graph expects a fast 202 regardless of processing outcome.
  return new NextResponse(null, { status: 202 });
}

// Graph's validation handshake can also arrive as a GET in some client
// libraries' documentation examples; handle it the same way defensively.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse(null, { status: 400 });
}
