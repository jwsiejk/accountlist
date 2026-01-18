"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { submitBooking } from "./actions";

type State = { ok?: boolean; error?: string };

type AvailabilityResponse = {
  date: string;
  officeId: number;
  bookings: { start: string; end: string }[];
};

// Keep consistent with the schedule page for MVP.
const WORK_START_MIN = 8 * 60;
const WORK_END_MIN = 18 * 60;
const SLOT_MIN = 15;
const DEFAULT_DURATION_MIN = 60;
const DURATIONS_MIN = [15, 30, 45, 60] as const;

function withBasePath(path: string) {
  // When the app is hosted under a base path (e.g. /partner-hub),
  // browser fetches to absolute paths like /api/* must be prefixed.
  if (typeof window === "undefined") return path;
  const seg = window.location.pathname.split("/")[1];
  if (seg && window.location.pathname.startsWith(`/${seg}/`)) {
    // If we're under a known base segment, prefix it for API calls.
    if (window.location.pathname.startsWith(`/${seg}/offices`) || window.location.pathname.startsWith(`/${seg}/bookings`)) {
      return `/${seg}${path}`;
    }
  }
  return path;
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="mt-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-60"
    >
      {pending ? "Submitting..." : "Submit booking"}
    </button>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTimeValue(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfDayFromDateKey(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function intersects(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function hasOverlap(start: Date, end: Date, bookings: { start: Date; end: Date }[]) {
  return bookings.some((b) => intersects(start, end, b.start, b.end));
}

function parseLocal(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return null;
  // Build a datetime-local string (no timezone), e.g. 2026-01-17T09:30
  const v = `${dateStr}T${timeStr}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimeLabel(hhmm: string) {
  const [hh, mm] = hhmm.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${pad2(m)} ${am ? "AM" : "PM"}`;
}

function formatDurationLabel(min: number) {
  if (min === 60) return "1 hour";
  if (min % 60 === 0) {
    const h = min / 60;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  return `${min} min`;
}

function safeParseIso(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function BookingForm({
  officeId,
  initialStartIso,
  initialEndIso,
}: {
  officeId: number;
  initialStartIso?: string;
  initialEndIso?: string;
}) {
  const [state, formAction] = useFormState<State, FormData>(submitBooking, {});

  // Defaults: start = next hour (rounded), end = +1 hour
  const now = useMemo(() => new Date(), []);
  const roundedStart = useMemo(() => {
    const d = new Date(now);
    d.setSeconds(0);
    d.setMilliseconds(0);
    d.setMinutes(0);
    d.setHours(d.getHours() + 1);
    return d;
  }, [now]);

  const initialStart = useMemo(() => safeParseIso(initialStartIso), [initialStartIso]);
  const initialEnd = useMemo(() => safeParseIso(initialEndIso), [initialEndIso]);

  const initStart = initialStart ?? roundedStart;
  const initEnd = initialEnd ?? addMinutes(initStart, 60);

  const inferredDurationMin = useMemo(() => {
    if (initialStart && initialEnd) {
      const diff = Math.round((initialEnd.getTime() - initialStart.getTime()) / 60_000);
      const max = WORK_END_MIN - WORK_START_MIN;
      if (Number.isFinite(diff) && diff > 0) {
        return Math.max(SLOT_MIN, Math.min(max, diff));
      }
    }
    return DEFAULT_DURATION_MIN;
  }, [initialEnd, initialStart]);

  const [durationMin, setDurationMin] = useState<number>(() => inferredDurationMin);

  const [startDate, setStartDate] = useState(() => toDateInputValue(initStart));
  const [startTime, setStartTime] = useState(() => toTimeValue(initStart));

  const [endDate, setEndDate] = useState(() => toDateInputValue(initEnd));
  const [endTime, setEndTime] = useState(() => toTimeValue(initEnd));

  const [allDay, setAllDay] = useState(false);
  const [allDayError, setAllDayError] = useState<string>("");
  const endWasManuallySet = useRef(Boolean(initialStart && initialEnd));
  const lastNonAllDay = useRef({
    startTime: toTimeValue(initStart),
    endTime: toTimeValue(initEnd),
  });

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>("");

  // Load bookings for the selected start date so we can filter dropdowns to *available only*.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!startDate) return;
      setAvailabilityLoading(true);
      setAvailabilityError("");
      try {
        const res = await fetch(
          withBasePath(`/api/offices/${officeId}/availability?date=${encodeURIComponent(startDate)}`)
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Failed to load availability (${res.status})`);
        }
        const data = (await res.json()) as AvailabilityResponse;
        if (!cancelled) setAvailability(data);
      } catch (e: any) {
        if (!cancelled) setAvailabilityError(e?.message || "Failed to load availability.");
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [officeId, startDate]);

  const booked = useMemo(() => {
    const list = availability?.bookings ?? [];
    return list
      .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
      .filter((b) => !Number.isNaN(b.start.getTime()) && !Number.isNaN(b.end.getTime()));
  }, [availability]);

  const canAllDay = useMemo(() => {
    // All-day blocks 00:00–23:59 and conflicts with any booking on that day.
    return booked.length === 0;
  }, [booked.length]);

  const availableStartTimes = useMemo(() => {
    const dayStart = startOfDayFromDateKey(startDate);
    if (!dayStart) return [] as string[];
    const out: string[] = [];

    const lastStart = WORK_END_MIN - durationMin;
    for (let m = WORK_START_MIN; m <= lastStart; m += SLOT_MIN) {
      const s = new Date(dayStart);
      s.setMinutes(m);
      const e = addMinutes(s, durationMin);
      if (!hasOverlap(s, e, booked)) {
        out.push(toTimeValue(s));
      }
    }
    return out;
  }, [booked, startDate, durationMin]);

  const availableEndTimes = useMemo(() => {
    if (allDay) return ["23:59"];
    const dayStart = startOfDayFromDateKey(startDate);
    const start = parseLocal(startDate, startTime);
    if (!dayStart || !start) return [] as string[];

    const workEnd = new Date(dayStart);
    workEnd.setMinutes(WORK_END_MIN);

    const out: string[] = [];
    let cursor = addMinutes(start, SLOT_MIN);
    while (cursor <= workEnd) {
      if (hasOverlap(start, cursor, booked)) break;
      out.push(toTimeValue(cursor));
      cursor = addMinutes(cursor, SLOT_MIN);
    }
    return out;
  }, [allDay, booked, startDate, startTime]);

  // If the user changes date (or bookings load) and current start is no longer available, snap to first available.
  useEffect(() => {
    if (allDay) return;
    if (availabilityLoading) return;
    if (availableStartTimes.length === 0) return;
    if (!availableStartTimes.includes(startTime)) {
      setStartTime(availableStartTimes[0]);
      endWasManuallySet.current = false;
    }
  }, [allDay, availabilityLoading, availableStartTimes, startTime]);

  // Auto-populate end when start/duration changes: end date same-day, end time defaults to +duration.
  useEffect(() => {
    // For MVP, keep bookings same-day to simplify availability.
    setEndDate(startDate);

    if (allDay) {
      setStartTime("00:00");
      setEndTime("23:59");
      return;
    }

    const start = parseLocal(startDate, startTime);
    if (!start) return;
    if (availableEndTimes.length === 0) return;

    const desired = toTimeValue(addMinutes(start, durationMin));
    const desiredInList = availableEndTimes.includes(desired);

    if (!endWasManuallySet.current) {
      setEndTime(desiredInList ? desired : availableEndTimes[0]);
      endWasManuallySet.current = false;
      return;
    }

    // If user had set an end time that's no longer valid, snap back to a valid one.
    if (!availableEndTimes.includes(endTime)) {
      setEndTime(desiredInList ? desired : availableEndTimes[0]);
      endWasManuallySet.current = false;
    }
  }, [allDay, startDate, startTime, durationMin, availableEndTimes, endTime]);

  const startValue = `${startDate}T${startTime}`;
  const endValue = `${endDate}T${endTime}`;

  return (
    <form className="mt-4 grid gap-3" action={formAction}>
      <input type="hidden" name="officeId" value={officeId} />

      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-md border px-3 py-2"
          placeholder="Jane Doe"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border px-3 py-2"
          placeholder="jane@example.com"
        />
      </div>

      {/* Hidden fields submitted to the server action */}
      <input type="hidden" name="start" value={startValue} />
      <input type="hidden" name="end" value={endValue} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
        <div>
          <div className="text-sm font-medium">Duration</div>
          <div className="text-xs opacity-70">Booking length: {formatDurationLabel(durationMin)}.</div>
        </div>
        <div className="inline-flex rounded-lg border bg-black/5 p-1">
          {DURATIONS_MIN.map((d) => {
            const active = d === durationMin;
            return (
              <button
                key={d}
                type="button"
                disabled={allDay}
                onClick={() => {
                  setDurationMin(d);
                  endWasManuallySet.current = false;
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60 ${
                  active ? "bg-white" : "hover:bg-black/5"
                }`}
                aria-pressed={active}
              >
                {d < 60 ? `${d}m` : "1h"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div>
          <div className="text-sm font-medium">All day</div>
          <div className="text-xs opacity-70">Blocks the full day (00:00–23:59)</div>
        </div>
        <button
          type="button"
          disabled={!canAllDay && !allDay}
          onClick={() => {
            if (!canAllDay && !allDay) {
              setAllDayError("All-day is not available on this date.");
              return;
            }
            setAllDayError("");
            setAllDay((v) => {
              const next = !v;
              if (!next) {
                // Restore prior non-all-day times.
                setStartTime(lastNonAllDay.current.startTime);
                setEndTime(lastNonAllDay.current.endTime);
              } else {
                // Remember times in case user toggles back.
                lastNonAllDay.current = { startTime, endTime };
                endWasManuallySet.current = false;
              }
              return next;
            });
          }}
          className={`rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60 ${
            allDay ? "bg-black/5" : "hover:bg-black/5"
          }`}
          aria-pressed={allDay}
        >
          {allDay ? "All Day: On" : "All Day: Off"}
        </button>
      </div>
      {allDayError ? <div className="text-xs opacity-70">{allDayError}</div> : null}

      {availabilityLoading ? <div className="text-xs opacity-70">Loading availability…</div> : null}
      {availabilityError ? <div className="text-xs opacity-70">{availabilityError}</div> : null}
      {!availabilityLoading && !availabilityError && !allDay && availableStartTimes.length === 0 ? (
        <div className="rounded-md border p-3 text-sm">
          No available {formatDurationLabel(durationMin)} slots on this date.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-2 rounded-md border p-3">
          <div className="text-sm font-medium">Start</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-1">
              <label className="text-xs font-medium opacity-70" htmlFor="startDate">
                Date
              </label>
              <input
                id="startDate"
                type="date"
                required
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Requirement: choosing a start date auto-populates end date.
                  setEndDate(e.target.value);
                  endWasManuallySet.current = false;
                }}
              />
            </div>

            <div className="grid content-start gap-1">
              <label className="text-xs font-medium opacity-70" htmlFor="startTime">
                Time
              </label>
              <select
                id="startTime"
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={startTime}
                disabled={allDay || availabilityLoading || availableStartTimes.length === 0}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  endWasManuallySet.current = false;
                }}
              >
                {availableStartTimes.map((t) => (
                  <option key={t} value={t}>
                    {formatTimeLabel(t)}
                  </option>
                ))}
              </select>
              {!allDay && availableStartTimes.length > 0 ? (
                <div className="text-[11px] opacity-70">Only available start times shown.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-md border p-3">
          <div className="text-sm font-medium">End</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid content-start gap-1">
              <label className="text-xs font-medium opacity-70" htmlFor="endDate">
                Date
              </label>
              <input
                id="endDate"
                type="date"
                required
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={endDate}
                disabled
              />
              <div className="text-[11px] opacity-70">Same-day bookings for MVP.</div>
            </div>

            <div className="grid content-start gap-1">
              <label className="text-xs font-medium opacity-70" htmlFor="endTime">
                Time
              </label>
              <select
                id="endTime"
                className="h-10 w-full rounded-md border px-3 text-sm"
                value={endTime}
                disabled={allDay || availabilityLoading || (!allDay && availableEndTimes.length === 0)}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  endWasManuallySet.current = true;
                }}
              >
                {(allDay ? ["23:59"] : availableEndTimes).map((t) => (
                  <option key={t} value={t}>
                    {formatTimeLabel(t)}
                  </option>
                ))}
              </select>
              {!allDay && availableEndTimes.length > 0 ? (
                <div className="text-[11px] opacity-70">Only valid end times shown.</div>
              ) : null}
            </div>
          </div>
          {!allDay ? (
            <div className="text-xs opacity-70">
              Defaults to {formatDurationLabel(durationMin)} after start.
            </div>
          ) : null}
        </div>
      </div>

      {state?.error ? (
        <div className="rounded-md border p-3 text-sm">
          <span className="font-medium">Booking failed:</span> {state.error}
        </div>
      ) : null}

      <SubmitButton disabled={!allDay && availableStartTimes.length === 0} />

      <p className="text-xs opacity-70">Tip: For MVP, use Prisma Studio to seed offices.</p>
    </form>
  );
}
