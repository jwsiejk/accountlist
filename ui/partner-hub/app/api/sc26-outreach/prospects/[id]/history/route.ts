import { NextResponse } from "next/server";

import { getProspectHistory } from "@/lib/sc26-outreach/prospects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Full timeline for one prospect: every message ever sent to them and
 * every tracking event logged against each, in order -- including events
 * that were flagged `automated` (see eventClassification.ts) and so didn't
 * move the summary status shown in the main table. This is the "what
 * actually happened, and when" view referenced from the dashboard's
 * per-row expand.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const prospectId = Number(id);
    if (!Number.isInteger(prospectId)) {
      return NextResponse.json({ ok: false, error: "Invalid prospect id." }, { status: 400 });
    }

    const prospect = await getProspectHistory(prospectId);
    if (!prospect) {
      return NextResponse.json({ ok: false, error: "Prospect not found." }, { status: 404 });
    }

    const messages = prospect.messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      mailbox: m.mailbox,
      sentAt: m.sentAt,
      createdAt: m.createdAt,
      events: m.events.map((e) => {
        let meta: Record<string, unknown> | null = null;
        if (e.meta) {
          try {
            meta = JSON.parse(e.meta);
          } catch {
            meta = { raw: e.meta };
          }
        }
        return {
          id: e.id,
          type: e.type,
          occurredAt: e.occurredAt,
          automated: meta?.automated === true,
          reason: typeof meta?.reason === "string" ? meta.reason : undefined,
          userAgent: typeof meta?.userAgent === "string" ? meta.userAgent : undefined,
        };
      }),
    }));

    return NextResponse.json(
      {
        ok: true,
        prospect: {
          id: prospect.id,
          email: prospect.email,
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          status: prospect.status,
        },
        messages,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("sc26-outreach prospect history failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load history." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
