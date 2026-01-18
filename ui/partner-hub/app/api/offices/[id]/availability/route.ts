import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDateKey(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const officeId = Number(params.id);
  if (!Number.isFinite(officeId)) {
    return NextResponse.json({ error: "Invalid office id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || "";
  if (!isDateKey(date)) {
    return NextResponse.json(
      { error: "Missing or invalid date (expected YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  // Interpret the provided YYYY-MM-DD in the server's local timezone.
  const day = startOfDay(new Date(`${date}T00:00:00`));
  const nextDay = addDays(day, 1);

  // Return bookings that overlap this day.
  const bookings = await prisma.booking.findMany({
    where: {
      officeId,
      start: { lt: nextDay },
      end: { gt: day },
    },
    orderBy: { start: "asc" },
    select: {
      id: true,
      officeId: true,
      start: true,
      end: true,
      name: true,
      email: true,
    },
  });

  return NextResponse.json(
    {
      date,
      officeId,
      bookings: bookings.map((b) => ({
        id: b.id,
        officeId: b.officeId,
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        name: b.name,
        email: b.email,
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
