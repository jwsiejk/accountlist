import { prisma } from "./db";

export type CreateBookingInput = {
  officeId: number;
  name: string;
  email: string;
  start: Date;
  end: Date;
};

export async function hasBookingConflict(input: {
  officeId: number;
  start: Date;
  end: Date;
}): Promise<boolean> {
  // Overlap rule: existing.start < newEnd AND existing.end > newStart
  const overlap = await prisma.booking.findFirst({
    where: {
      officeId: input.officeId,
      start: { lt: input.end },
      end: { gt: input.start },
    },
    select: { id: true },
  });

  return Boolean(overlap);
}

export async function createBooking(input: CreateBookingInput) {
  if (input.end <= input.start) {
    return { ok: false as const, error: "End time must be after start time." };
  }

  const conflict = await hasBookingConflict({
    officeId: input.officeId,
    start: input.start,
    end: input.end,
  });

  if (conflict) {
    return { ok: false as const, error: "That time slot is already booked." };
  }

  const booking = await prisma.booking.create({
    data: {
      officeId: input.officeId,
      name: input.name,
      email: input.email,
      start: input.start,
      end: input.end,
    },
  });

  return { ok: true as const, booking };
}
