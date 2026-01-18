import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OfficeSchedulePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const office = await prisma.office.findUnique({
    where: { id },
  });

  if (!office) notFound();

  const bookings = await prisma.booking.findMany({
    where: { officeId: id },
    orderBy: { start: "asc" },
    take: 500,
  });

  const fmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`/offices/${id}`} className="underline" prefetch={false}>
              Back to {office.name}
            </Link>
            <Link href="/offices/schedule" className="underline" prefetch={false}>
              Main
            </Link>
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Office schedule</h1>
          <p className="mt-1 text-sm opacity-80">{office.name}</p>
        </div>
        <div className="text-sm">
          <Link href="/bookings" className="underline" prefetch={false}>
            My bookings
          </Link>
        </div>
      </div>

      {bookings.length === 0 ? (
        <p className="mt-8 text-sm opacity-80">No bookings yet for this office.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b last:border-b-0">
                  <td className="p-3">{b.name}</td>
                  <td className="p-3">{b.email}</td>
                  <td className="p-3">{fmt.format(new Date(b.start))}</td>
                  <td className="p-3">{fmt.format(new Date(b.end))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
