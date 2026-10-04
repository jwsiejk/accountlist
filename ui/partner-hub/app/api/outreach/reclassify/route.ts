import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { emailDomain } from "@/lib/outreach/eventClassification";
import { reclassifyEvents, statusFromHistory, type StoredTrackingEvent } from "@/lib/outreach/reclassify";
import type { ProspectStatusName } from "@/lib/outreach/sequence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMeta(meta: string | null): Record<string, unknown> {
  if (!meta) return {};
  try {
    const parsed = JSON.parse(meta);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Re-checks every logged open/click against the current automated-scan
 * rules (see lib/outreach/reclassify.ts) and corrects prospects whose
 * Opened/Clicked status no longer holds. `?dryRun=1` reports what would
 * change without writing anything.
 *
 * Protected by CRON_SECRET; run it from the "Outreach reclassify tracking"
 * GitHub Actions workflow.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

  const rows = await prisma.trackingEvent.findMany({
    where: { type: { in: ["OPEN", "CLICK"] } },
    select: {
      id: true,
      type: true,
      occurredAt: true,
      meta: true,
      outreachMessage: {
        select: { id: true, createdAt: true, sentAt: true, prospect: { select: { id: true, email: true, status: true } } },
      },
    },
  });

  const metaById = new Map<number, Record<string, unknown>>();
  const events: StoredTrackingEvent[] = rows.map((r) => {
    const meta = parseMeta(r.meta);
    metaById.set(r.id, meta);
    return {
      id: r.id,
      messageId: r.outreachMessage.id,
      prospectId: r.outreachMessage.prospect.id,
      type: r.type as "OPEN" | "CLICK",
      occurredAt: r.occurredAt,
      userAgent: typeof meta.userAgent === "string" ? meta.userAgent : undefined,
      ip: typeof meta.ip === "string" ? meta.ip : undefined,
      automated: meta.automated === true,
      dispatchedAt: r.outreachMessage.createdAt,
      confirmedSentAt: r.outreachMessage.sentAt,
      recipientDomain: emailDomain(r.outreachMessage.prospect.email),
    };
  });

  const verdicts = reclassifyEvents(events);
  const verdictById = new Map(verdicts.map((v) => [v.id, v]));

  // Status per prospect from the new verdicts.
  const prospects = new Map<number, { email: string; status: ProspectStatusName }>();
  for (const r of rows) {
    const p = r.outreachMessage.prospect;
    prospects.set(p.id, { email: p.email, status: p.status as ProspectStatusName });
  }
  const statusChanges: { prospectId: number; email: string; from: ProspectStatusName; to: ProspectStatusName }[] = [];
  for (const [prospectId, p] of Array.from(prospects.entries())) {
    const own = events
      .filter((e) => e.prospectId === prospectId)
      .map((e) => ({ type: e.type, automated: verdictById.get(e.id)!.automated }));
    const next = statusFromHistory(p.status, own);
    if (next !== p.status) statusChanges.push({ prospectId, email: p.email, from: p.status, to: next });
  }

  const changedEvents = verdicts.filter((v) => v.changed);
  if (!dryRun) {
    const reclassifiedAt = new Date().toISOString();
    for (const v of changedEvents) {
      const meta = metaById.get(v.id) ?? {};
      await prisma.trackingEvent.update({
        where: { id: v.id },
        data: {
          meta: JSON.stringify({
            ...meta,
            automated: v.automated,
            reason: v.reason,
            previousAutomated: meta.automated === true,
            previousReason: meta.reason,
            reclassifiedAt,
          }),
        },
      });
    }
    for (const c of statusChanges) {
      await prisma.prospect.update({ where: { id: c.prospectId }, data: { status: c.to } });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      dryRun,
      eventsChecked: events.length,
      nowAutomated: changedEvents.filter((v) => v.automated).length,
      nowReal: changedEvents.filter((v) => !v.automated).length,
      statusChanges,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
