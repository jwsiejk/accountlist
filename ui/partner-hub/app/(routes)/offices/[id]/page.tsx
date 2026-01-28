import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";

type UpcomingBookingRow = {
  id: string | number;
  name: string;
  email: string;
  start: string | Date;
  end: string | Date;
};

export default async function OfficeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ start?: string; end?: string }>;
}) {
  const p = await params;
  const sp = await searchParams;
  const id = Number(p.id);
  if (!Number.isFinite(id)) notFound();

  const office = await prisma.office.findUnique({
    where: { id },
  });

  if (!office) notFound();

  const upcoming = (await prisma.booking.findMany({
    where: { officeId: id, end: { gt: new Date() } },
    orderBy: { start: "asc" },
    take: 10,
  })) as UpcomingBookingRow[];

  // Availability for the booking form is loaded client-side via
  // /api/offices/[id]/availability to keep this page fast and simple.

  const fmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/offices/schedule"
            className="text-sm underline"
            prefetch={false}
          >
            Back to main
          </Link>
          <h1 className="mt-3 text-2xl font-semibold">{office.name}</h1>
          {office.address ? (
            <div className="mt-1 text-sm opacity-80">{office.address}</div>
          ) : null}
          {office.description ? (
            <p className="mt-3 text-sm opacity-90">{office.description}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          <Link href="/bookings" className="underline" prefetch={false}>
            My bookings
          </Link>
          <Link
            href={`/offices/${id}/bookings`}
            className="underline"
            prefetch={false}
          >
            Office schedule
          </Link>
        </div>
      </div>

      <section className="mt-8 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Book this office</h2>
        <p className="mt-1 text-sm opacity-80">
          Enter your info and pick a start/end time. Conflicts are blocked.
        </p>

        <BookingForm
          officeId={id}
          initialStartIso={sp?.start}
          initialEndIso={sp?.end}
        />
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Upcoming bookings (top 10)</h2>
          <Link
            href={`/offices/${id}/bookings`}
            className="text-sm underline"
            prefetch={false}
          >
            View full schedule
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm opacity-80">No upcoming bookings.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((b) => (
              <li key={String(b.id)} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{b.name}</div>
                <div className="opacity-80">{b.email}</div>
                <div className="mt-1 opacity-80">
                  {fmt.format(new Date(b.start))} → {fmt.format(new Date(b.end))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
