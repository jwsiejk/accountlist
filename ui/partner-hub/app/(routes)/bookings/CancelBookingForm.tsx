"use client";

import { useFormState, useFormStatus } from "react-dom";
import { cancelBooking } from "./actions";

type State = { ok?: boolean; error?: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-md border px-2 py-1 text-xs"
      disabled={pending}
    >
      {pending ? "Cancelling..." : "Cancel"}
    </button>
  );
}

export function CancelBookingForm({ bookingId }: { bookingId: number }) {
  const [state, formAction] = useFormState<State, FormData>(cancelBooking, {});

  return (
    <div>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="bookingId" value={String(bookingId)} />
        <input
          name="email"
          placeholder="Confirm email"
          className="w-40 rounded-md border px-2 py-1 text-xs"
          required
        />
        <SubmitButton />
      </form>
      {state?.error ? (
        <div className="mt-1 text-xs text-red-600">{state.error}</div>
      ) : null}
      {state?.ok ? (
        <div className="mt-1 text-xs text-green-700">Cancelled.</div>
      ) : null}
    </div>
  );
}
