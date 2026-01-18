import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function isValidDateKey(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * GET /api/office-booking/availability?officeId=1&date=YYYY-MM-DD
 * Returns all bookings for the given office that overlap the provided local day.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const officeIdRaw = url.searchParams.get("officeId") || "";
  const dateKey = url.searchParams.get("date") || "";

  const officeId = Number(officeIdRaw);
  if (!Number.isFinite(officeId) || officeId <= 0) {
    return NextResponse.json({ error: "Invalid officeId" }, { status: 400 });
  }
  if (!isValidDateKey(dateKey)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const base = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(base.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const dayStart = startOfDayLocal(base);
  const dayEnd = addDays(dayStart, 1);

  const bookings = await prisma.booking.findMany({
    where: {
      officeId,
      start: { lt: dayEnd },
      end: { gt: dayStart },
    },
    select: {
      id: true,
      start: true,
      end: true,
    },
    orderBy: { start: "asc" },
  });

  return NextResponse.json(
    {
      officeId,
      date: dateKey,
      bookings: bookings.map((b) => ({
        id: b.id,
        start: b.start.toISOString(),
        end: b.end.toISOString(),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
