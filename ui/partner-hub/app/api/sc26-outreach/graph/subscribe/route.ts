import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createSubscription, renewSubscription } from "@/lib/sc26-outreach/graph";
import { graphWebhookUrl } from "@/lib/sc26-outreach/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates or renews the Graph change-notification subscription for
 * SC26_MAILBOX's Inbox. Mail subscriptions expire in under 3 days, so this
 * is meant to be hit on a recurring schedule (a Render Cron Job -- see
 * SETUP.md) rather than relied on to run once.
 *
 * Protected by CRON_SECRET so it can't be triggered by anyone who finds
 * the URL.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const mailbox = process.env.SC26_MAILBOX;
  const clientState = process.env.GRAPH_WEBHOOK_CLIENT_STATE;
  if (!mailbox || !clientState) {
    return NextResponse.json(
      { ok: false, error: "SC26_MAILBOX and GRAPH_WEBHOOK_CLIENT_STATE must be set." },
      { status: 500 }
    );
  }

  const existing = await prisma.mailSubscription.findUnique({ where: { mailbox } });

  try {
    if (existing) {
      const renewed = await renewSubscription(existing.graphSubscriptionId);
      await prisma.mailSubscription.update({
        where: { mailbox },
        data: { expiresAt: new Date(renewed.expirationDateTime) },
      });
      return NextResponse.json({ ok: true, action: "renewed", expiresAt: renewed.expirationDateTime });
    }

    const created = await createSubscription({
      mailbox,
      notificationUrl: graphWebhookUrl(),
      clientState,
    });
    await prisma.mailSubscription.create({
      data: {
        mailbox,
        graphSubscriptionId: created.id,
        expiresAt: new Date(created.expirationDateTime),
      },
    });
    return NextResponse.json({ ok: true, action: "created", expiresAt: created.expirationDateTime });
  } catch (err) {
    // Renewal can fail if Graph already expired/deleted the subscription
    // (e.g. we missed a renewal window) -- fall back to creating fresh.
    if (existing) {
      try {
        const created = await createSubscription({
          mailbox,
          notificationUrl: graphWebhookUrl(),
          clientState,
        });
        await prisma.mailSubscription.update({
          where: { mailbox },
          data: {
            graphSubscriptionId: created.id,
            expiresAt: new Date(created.expirationDateTime),
          },
        });
        return NextResponse.json({
          ok: true,
          action: "recreated_after_renew_failure",
          expiresAt: created.expirationDateTime,
        });
      } catch (err2) {
        return NextResponse.json(
          { ok: false, error: err2 instanceof Error ? err2.message : String(err2) },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
