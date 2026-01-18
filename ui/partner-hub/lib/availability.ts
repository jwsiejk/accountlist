import { prisma } from "@/lib/db";

export type BookingRangeRow = {
  id: number;
  officeId: number;
  start: Date;
  end: Date;
  name: string;
  email: string;
};

export async function getBookingsInRange(start: Date, end: Date): Promise<BookingRangeRow[]> {
  return prisma.booking.findMany({
    where: {
      // Any overlap with [start, end)
      start: { lt: end },
      end: { gt: start },
    },
    select: {
      id: true,
      officeId: true,
      start: true,
      end: true,
      name: true,
      email: true,
    },
    orderBy: [{ officeId: "asc" }, { start: "asc" }],
  });
}
