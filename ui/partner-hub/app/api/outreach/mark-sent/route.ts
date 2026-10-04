import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { logEvent, markStatus } from "@/lib/outreach/prospects";
import { SEQUENCE_STEPS, type SequenceStep } from "@/lib/outreach/sequence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MarkSentBody {
  prospectId: number;
  step: number;
}

/**
 * Records by hand that an unconfirmed send actually went out -- for when the
 * person finds the email in the DDN mailbox's Sent Items but the send-flow's
 * confirmation never came back. Sets the most recent unconfirmed message for
 * that step as sent (dated to when it was queued) and logs a
 * SEND_CONFIRMED event marked as manual, which locks the contact against
 * ever being sent that email again.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as MarkSentBody | null;
  const prospectId = body?.prospectId;
  const step = body?.step;

  if (!Number.isInteger(prospectId)) {
    return NextResponse.json({ ok: false, error: "prospectId must be an integer." }, { status: 400 });
  }
  if (!SEQUENCE_STEPS.includes(step as SequenceStep)) {
    return NextResponse.json({ ok: false, error: "step must be 1, 2 or 3." }, { status: 400 });
  }

  const message = await prisma.outreachMessage.findFirst({
    where: { prospectId: prospectId as number, step: step as number, sentAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!message) {
    return NextResponse.json(
      { ok: false, error: `No unconfirmed Email ${step} request found for this contact.` },
      { status: 404 }
    );
  }

  await prisma.outreachMessage.update({ where: { id: message.id }, data: { sentAt: message.createdAt } });
  await logEvent(message.id, "SEND_CONFIRMED", { source: "manual", markedAt: new Date().toISOString() }, message.createdAt);
  await markStatus(message.prospectId, "SENT");

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
