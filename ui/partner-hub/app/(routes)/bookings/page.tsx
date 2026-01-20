import Link from "next/link";
import { prisma } from "@/lib/db";
import { CancelBookingForm } from "./CancelBookingForm";

export const dynamic = "force-dynamic";

type BookingWithOffice = {
  id: string | number;
  officeId: string;
  name: string;
  email: string;
  start: string | Date;
  end: string | Date;
  office: {
    name: string;
  };
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: { created?: string };
}) {
  const bookings = (await prisma.booking.findMany({
    orderBy: { start: "desc" },
    take: 200,
    include: { office: true },
  })) as BookingWithOffice[];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Bookings</h1>
          <p className="text-sm opacity-80">
            MVP: shows recent bookings (no auth yet).
          </p>
        </div>
        <Link href="/offices" className="text-sm underline" prefetch={false}>
          Back to offices
        </Link>
      </div>

      {searchParams?.created ? (
        <div className="mt-6 rounded-xl border p-3 text-sm">
          ✅ Booking created.
        </div>
      ) : null}

      {bookings.length === 0 ? (
        <p className="mt-8 text-sm opacity-80">No bookings yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">Office</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Cancel</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={String(b.id)} className="border-b last:border-b-0">
                  <td className="p-3">
                    <Link
                      href={`/offices/${b.officeId}`}
                      className="underline"
                      prefetch={false}
                    >
                      {b.office.name}
                    </Link>
                  </td>
                  <td className="p-3">{b.name}</td>
                  <td className="p-3">{b.email}</td>
                  <td className="p-3">{new Date(b.start).toLocaleString()}</td>
                  <td className="p-3">{new Date(b.end).toLocaleString()}</td>
                  <td className="p-3">
                    <CancelBookingForm bookingId={Number(b.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
