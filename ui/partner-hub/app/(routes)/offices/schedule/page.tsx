import { prisma } from "@/lib/db";
import { getBookingsInRange } from "@/lib/availability";
import { OfficeScheduleClient } from "./OfficeScheduleClient";

export const dynamic = "force-dynamic";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default async function OfficeSchedulePage({
  searchParams,
}: {
  searchParams?: { date?: string; office?: string; duration?: string };
}) {
  const todayKey = toDateKey(new Date());
  const dateKey = searchParams?.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : todayKey;

  const base = new Date(`${dateKey}T00:00:00`);
  const baseDay = Number.isNaN(base.getTime()) ? new Date() : base;

  // We render a Cal.com-style month selector. Fetch bookings for the displayed month.
  const monthStart = new Date(baseDay.getFullYear(), baseDay.getMonth(), 1);
  const monthEnd = new Date(baseDay.getFullYear(), baseDay.getMonth() + 1, 1);

  const offices = await prisma.office.findMany({
    select: { id: true, name: true, address: true, description: true },
    orderBy: { name: "asc" },
  });

  const officeParam = Number(searchParams?.office);
  const defaultOfficeId = offices[0]?.id ?? 0;
  const initialOfficeId =
    Number.isFinite(officeParam) && offices.some((o) => o.id === officeParam)
      ? officeParam
      : defaultOfficeId;

  const durationParam = Number(searchParams?.duration);
  const initialDurationMin = [15, 30, 45, 60].includes(durationParam) ? durationParam : 60;

  const bookings = await getBookingsInRange(monthStart, monthEnd);

  return (
    <OfficeScheduleClient
      offices={offices}
      bookings={bookings.map((b) => ({
        id: b.id,
        officeId: b.officeId,
        start: b.start.toISOString(),
        end: b.end.toISOString(),
        name: b.name,
        email: b.email,
      }))}
      initialDate={dateKey}
      initialOfficeId={initialOfficeId}
      initialDurationMin={initialDurationMin}
    />
  );
}
