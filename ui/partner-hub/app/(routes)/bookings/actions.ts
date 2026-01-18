"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

type State = { ok?: boolean; error?: string };

export async function cancelBooking(_prev: State, formData: FormData): Promise<State> {
  const bookingId = Number(formData.get("bookingId"));
  const email = String(formData.get("email") ?? "").trim();

  if (!Number.isFinite(bookingId)) {
    return { ok: false, error: "Invalid booking." };
  }

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Please confirm your email to cancel." };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, officeId: true, email: true },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }

  if (booking.email.toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: "Email does not match this booking." };
  }

  await prisma.booking.delete({ where: { id: bookingId } });

  revalidatePath("/bookings");
  revalidatePath(`/offices/${booking.officeId}`);
  revalidatePath(`/offices/${booking.officeId}/bookings`);

  return { ok: true };
}
