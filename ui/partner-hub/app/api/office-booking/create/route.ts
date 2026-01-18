import { NextResponse } from "next/server";

import { createBooking } from "@/lib/officeBooking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  const e = String(email || "").trim();
  if (!e) return false;
  if (!e.includes("@")) return false;
  if (e.startsWith("@") || e.endsWith("@")) return false;
  return true;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const officeId = Number(body?.officeId);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const startIso = String(body?.start ?? "");
  const endIso = String(body?.end ?? "");

  if (!Number.isFinite(officeId) || officeId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid office." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ ok: false, error: "Missing name." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email." }, { status: 400 });
  }

  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid start/end." }, { status: 400 });
  }
  if (end.getTime() <= start.getTime()) {
    return NextResponse.json({ ok: false, error: "End time must be after start time." }, { status: 400 });
  }

  // Guardrail: prevent booking in the past.
  if (start.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ ok: false, error: "Start time must be in the future." }, { status: 400 });
  }

  const result = await createBooking({
    officeId,
    name,
    email,
    start,
    end,
  });

  if (!result.ok) {
    // Conflict or validation.
    const status = result.error.includes("already booked") ? 409 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json(
    {
      ok: true,
      booking: {
        id: result.booking.id,
        officeId: result.booking.officeId,
        start: result.booking.start.toISOString(),
        end: result.booking.end.toISOString(),
        name: result.booking.name,
        email: result.booking.email,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
