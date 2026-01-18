"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBooking } from "@/lib/officeBooking";

type State = { ok?: boolean; error?: string };

function parseLocalDateTime(value: string): Date | null {
  // HTML datetime-local returns "YYYY-MM-DDTHH:mm" (no timezone). We'll interpret
  // it as local time in the server's environment.
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function submitBooking(_prev: State, formData: FormData): Promise<State> {
  const officeId = Number(formData.get("officeId"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const startStr = String(formData.get("start") ?? "");
  const endStr = String(formData.get("end") ?? "");

  if (!Number.isFinite(officeId)) {
    return { ok: false, error: "Invalid office." };
  }

  const start = parseLocalDateTime(startStr);
  const end = parseLocalDateTime(endStr);

  if (!name || !email || !start || !end) {
    return { ok: false, error: "Please fill out all fields." };
  }

  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    return { ok: false, error: "Please enter a valid email." };
  }

  if (end.getTime() <= start.getTime()) {
    return { ok: false, error: "End time must be after start time." };
  }

  // Optional guardrail: prevent booking in the past.
  if (start.getTime() < Date.now() - 60_000) {
    return { ok: false, error: "Start time must be in the future." };
  }

  const result = await createBooking({
    officeId,
    name,
    email,
    start,
    end,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/offices/${officeId}`);
  revalidatePath("/bookings");

  redirect("/bookings?created=1");
}
