import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type OfficeRow = {
  id: string | number;
  name: string;
  address?: string | null;
  description?: string | null;
};

export default async function OfficesPage() {
  const offices = (await prisma.office.findMany({
    orderBy: { name: "asc" },
  })) as OfficeRow[];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Offices</h1>
          <p className="text-sm opacity-80">
            Select an office to view details and book a time.
          </p>
        </div>
        <Link className="text-sm underline" href="/bookings" prefetch={false}>
          View bookings
        </Link>
      </div>

      {offices.length === 0 ? (
        <div className="mt-8 rounded-lg border p-4 text-sm">
          <p className="font-medium">No offices yet.</p>
          <p className="mt-1 opacity-80">
            Seed offices using Prisma Studio: <code>npx prisma studio</code>
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {offices.map((o) => (
            <Link
              key={o.id}
              href={`/offices/${o.id}`}
              prefetch={false}
              className="rounded-xl border p-4 hover:bg-black/5"
            >
              <div className="text-lg font-semibold">{o.name}</div>
              {o.address ? (
                <div className="mt-1 text-sm opacity-80">{o.address}</div>
              ) : null}
              {o.description ? (
                <div className="mt-2 text-sm opacity-80 line-clamp-2">
                  {o.description}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
