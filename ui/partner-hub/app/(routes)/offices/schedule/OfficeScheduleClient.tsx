"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { withBasePath } from "@/lib/basePath";

export type OfficeRow = {
  id: number;
  name: string;
  address?: string | null;
  description?: string | null;
};

export type BookingLite = {
  id: number;
  officeId: number;
  start: string; // ISO
  end: string; // ISO
  name: string;
  email: string;
};

type UserInfo = {
  name: string;
  email: string;
};

type MyBooking = {
  id: number;
  officeId: number;
  start: string;
  end: string;
  name: string;
  email: string;
};

type SlotStatus = "available" | "booked" | "past";
type Slot = {
  start: Date;
  end: Date;
  status: SlotStatus;
};

type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AiExtracted = {
  dateISO?: string;
  timePreference?: string;
  durationMinutes?: number;
  officePreferenceId?: number;
  selectionIndex?: number;
};

type AiOption = {
  label: string;
  officeId: string;
  startISO: string;
  durationMinutes: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const d = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function intersects(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

function hasOverlap(start: Date, end: Date, bookings: { start: Date; end: Date }[]) {
  return bookings.some((b) => intersects(start, end, b.start, b.end));
}

function formatMonthLabel(d: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(d);
}

function formatDayLabel(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatTime(d: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
}

function formatDurationLabel(minutes: number) {
  if (minutes === 60) return "1h";
  return `${minutes}m`;
}

function minutesIntoDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function parseTimePreference(value: string) {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes("morning")) return { startMin: 8 * 60, endMin: 12 * 60 };
  if (raw.includes("afternoon")) return { startMin: 12 * 60, endMin: 17 * 60 };
  if (raw.includes("evening")) return { startMin: 17 * 60, endMin: 19 * 60 };
  if (raw.includes("noon")) return { startMin: 12 * 60, endMin: 13 * 60 };

  const match = raw.match(/(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?/);
  if (!match) return null;
  const hoursRaw = Number(match[1]);
  const minutesRaw = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(hoursRaw) || hoursRaw < 0 || hoursRaw > 23) return null;
  if (!Number.isFinite(minutesRaw) || minutesRaw < 0 || minutesRaw >= 60) return null;
  let hours = hoursRaw;
  const meridiem = match[3];
  if (meridiem) {
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  const minutes = hours * 60 + minutesRaw;
  return { startMin: minutes, endMin: minutes + 120 };
}

// MVP working hours.
const WORK_START_MIN = 8 * 60;
const WORK_END_MIN = 18 * 60;
const DURATIONS_MIN = [15, 30, 45, 60] as const;

function isValidEmail(email: string) {
  const e = email.trim();
  if (!e) return false;
  if (!e.includes("@")) return false;
  if (e.startsWith("@") || e.endsWith("@")) return false;
  // Minimal check.
  return true;
}

function computeDaySlots({
  date,
  durationMin,
  busy,
  now,
}: {
  date: Date;
  durationMin: number;
  busy: { start: Date; end: Date }[];
  now: Date;
}): Slot[] {
  const dayStart = startOfDay(date);
  const workStart = new Date(dayStart);
  workStart.setMinutes(WORK_START_MIN);
  const workEnd = new Date(dayStart);
  workEnd.setMinutes(WORK_END_MIN);

  const clippedBusy = busy
    .filter((b) => intersects(b.start, b.end, workStart, workEnd))
    .map((b) => ({
      start: new Date(Math.max(b.start.getTime(), workStart.getTime())),
      end: new Date(Math.min(b.end.getTime(), workEnd.getTime())),
    }));

  const todayKey = toDateKey(now);
  const slotDayKey = toDateKey(dayStart);

  const out: Slot[] = [];
  const lastStart = WORK_END_MIN - durationMin;
  for (let m = WORK_START_MIN; m <= lastStart; m += durationMin) {
    const s = new Date(dayStart);
    s.setMinutes(m);
    const e = addMinutes(s, durationMin);

    let status: SlotStatus = "available";
    if (slotDayKey === todayKey && s.getTime() < now.getTime()) {
      status = "past";
    } else if (hasOverlap(s, e, clippedBusy)) {
      status = "booked";
    }

    out.push({ start: s, end: e, status });
  }
  return out;
}

function DurationChips({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-border/70 bg-muted/30 p-1">
      {DURATIONS_MIN.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={
              "rounded-lg px-3 py-2 text-sm font-semibold transition " +
              (active
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground/70 hover:bg-muted/40")
            }
            aria-pressed={active}
          >
            {d < 60 ? `${d}m` : "1h"}
          </button>
        );
      })}
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div className="relative w-[92vw] max-w-lg rounded-2xl border border-border/70 bg-background shadow-lg">
        <div className="flex items-center justify-between border-b border-border/70 p-4">
          <div className="text-sm font-semibold">{title}</div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/80 transition hover:bg-muted"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function OfficeScheduleClient({
  offices,
  bookings,
  initialDate,
  initialOfficeId,
  initialDurationMin,
}: {
  offices: OfficeRow[];
  bookings: BookingLite[];
  initialDate: string; // YYYY-MM-DD
  initialOfficeId: number;
  initialDurationMin: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [now, setNow] = useState<Date>(() => new Date());

  const [user, setUser] = useState<UserInfo | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [myScheduleOpen, setMyScheduleOpen] = useState(false);

  const [officeId, setOfficeId] = useState<number>(initialOfficeId);
  const [dateKey, setDateKey] = useState<string>(initialDate);
  const [durationMin, setDurationMin] = useState<number>(initialDurationMin);

  const [selectedSlotStarts, setSelectedSlotStarts] = useState<string[]>([]);
  const [bookAllDay, setBookAllDay] = useState(false);

  const [bookingError, setBookingError] = useState<string>("");
  const [bookingSuccess, setBookingSuccess] = useState<string>("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [myBookingsLoading, setMyBookingsLoading] = useState(false);
  const [myBookingsError, setMyBookingsError] = useState<string>("");

  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiOptions, setAiOptions] = useState<AiOption[]>([]);
  const [aiSelectedOption, setAiSelectedOption] = useState<AiOption | null>(null);
  const [aiBookingSubmitting, setAiBookingSubmitting] = useState(false);
  const [aiBookingSuccess, setAiBookingSuccess] = useState("");

  const unlocked = Boolean(user);

  // Tick "now" so today slots become past without a reload.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Load stored user.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("officeSchedule.user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const name = String(parsed?.name ?? "").trim();
      const email = String(parsed?.email ?? "").trim();
      if (name && isValidEmail(email)) setUser({ name, email });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!aiOpen) return;
    setAiMessages([
      {
        role: "assistant",
        content: "Tell me the date, time, and office you want, and I’ll find availability.",
      },
    ]);
    setAiInput("");
    setAiError("");
    setAiOptions([]);
    setAiSelectedOption(null);
    setAiBookingSuccess("");
  }, [aiOpen]);

  // Keep UI state in sync with URL navigation (back/forward).
  useEffect(() => {
    if (!sp) return;
    const qOffice = Number(sp.get("office"));
    const qDate = sp.get("date");
    const qDuration = Number(sp.get("duration"));

    if (Number.isFinite(qOffice) && qOffice && qOffice !== officeId) setOfficeId(qOffice);
    if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) && qDate !== dateKey) setDateKey(qDate);
    if ([15, 30, 45, 60].includes(qDuration) && qDuration !== durationMin) setDurationMin(qDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Clear selections when the schedule context changes.
  useEffect(() => {
    setSelectedSlotStarts([]);
    setBookAllDay(false);
    setBookingError("");
    setBookingSuccess("");
  }, [officeId, dateKey, durationMin]);

  const selectedOffice = useMemo(() => {
    return offices.find((o) => o.id === officeId) ?? offices[0] ?? null;
  }, [offices, officeId]);

  const officeNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const o of offices) map.set(o.id, o.name);
    return map;
  }, [offices]);

  const baseDate = useMemo(() => {
    return fromDateKey(dateKey) ?? new Date();
  }, [dateKey]);

  const monthFirst = useMemo(() => {
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  }, [baseDate]);

  const gridStart = useMemo(() => {
    return addDays(monthFirst, -monthFirst.getDay()); // Sunday
  }, [monthFirst]);

  const gridDays = useMemo(() => {
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [gridStart]);

  const officeBusy = useMemo(() => {
    if (!selectedOffice) return [] as { start: Date; end: Date }[];
    return bookings
      .filter((b) => b.officeId === selectedOffice.id)
      .map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
      .filter((b) => !Number.isNaN(b.start.getTime()) && !Number.isNaN(b.end.getTime()));
  }, [bookings, selectedOffice]);

  const bookingsByOffice = useMemo(() => {
    const map = new Map<number, { start: Date; end: Date }[]>();
    for (const booking of bookings) {
      const start = new Date(booking.start);
      const end = new Date(booking.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      const list = map.get(booking.officeId) ?? [];
      list.push({ start, end });
      map.set(booking.officeId, list);
    }
    return map;
  }, [bookings]);

  const bookedDayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const b of officeBusy) {
      let cursor = startOfDay(b.start);
      const endDay = startOfDay(b.end);
      while (cursor <= endDay) {
        set.add(toDateKey(cursor));
        cursor = addDays(cursor, 1);
      }
    }
    return set;
  }, [officeBusy]);

  const availabilityCountByDayKey = useMemo(() => {
    // Only compute for the displayed month (not the leading/trailing grid days).
    const y = monthFirst.getFullYear();
    const m = monthFirst.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const out = new Map<string, number>();

    const todayStart = startOfDay(now);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(y, m, day);
      if (startOfDay(d) < todayStart) continue;
      const k = toDateKey(d);
      const slots = computeDaySlots({ date: d, durationMin, busy: officeBusy, now });
      const available = slots.filter((s) => s.status === "available").length;
      if (available > 0) out.set(k, available);
    }
    return out;
  }, [durationMin, monthFirst, officeBusy, now]);

  const availabilityIndex = useMemo(() => {
    const out = new Map<number, Map<number, Date[]>>();
    const startDay = startOfDay(now);
    const maxDays = 14;
    const slotLimit = 24;

    for (const office of offices) {
      const busy = bookingsByOffice.get(office.id) ?? [];
      const byDuration = new Map<number, Date[]>();
      for (const duration of DURATIONS_MIN) {
        const slots: Date[] = [];
        for (let day = 0; day < maxDays && slots.length < slotLimit; day += 1) {
          const date = addDays(startDay, day);
          const daySlots = computeDaySlots({ date, durationMin: duration, busy, now });
          for (const slot of daySlots) {
            if (slot.status !== "available") continue;
            slots.push(slot.start);
            if (slots.length >= slotLimit) break;
          }
        }
        byDuration.set(duration, slots);
      }
      out.set(office.id, byDuration);
    }

    return out;
  }, [bookingsByOffice, now, offices]);

  const aiAvailabilityContext = useMemo(() => {
    return offices.map((office) => ({
      officeId: office.id,
      name: office.name,
      slotsByDuration: DURATIONS_MIN.map((duration) => ({
        durationMinutes: duration,
        slots: (availabilityIndex.get(office.id)?.get(duration) ?? [])
          .slice(0, 6)
          .map((d) => d.toISOString()),
      })),
    }));
  }, [availabilityIndex, offices]);

  // If the selected day has no availability (or is in the past), snap to the
  // next available day in the displayed month (Cal.com-style default behavior).
  useEffect(() => {
    const selectedDate = fromDateKey(dateKey);
    if (!selectedDate) return;
    const selectedIsPast = startOfDay(selectedDate) < startOfDay(now);
    const selectedCount = availabilityCountByDayKey.get(dateKey) ?? 0;
    if (!selectedIsPast && selectedCount > 0) return;

    for (const [k] of availabilityCountByDayKey) {
      const d = fromDateKey(k);
      if (!d) continue;
      if (startOfDay(d) < startOfDay(now)) continue;
      if (k !== dateKey) {
        setDateKey(k);
        pushState({ dateKey: k });
      }
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityCountByDayKey, now]);

  const selectedDaySlots = useMemo(() => {
    return computeDaySlots({ date: baseDate, durationMin, busy: officeBusy, now });
  }, [baseDate, durationMin, officeBusy, now]);

  const selectedDayAvailableCount = useMemo(() => {
    return selectedDaySlots.filter((s) => s.status === "available").length;
  }, [selectedDaySlots]);

  const todayKey = useMemo(() => toDateKey(now), [now]);

  function pushState(next: { officeId?: number; dateKey?: string; durationMin?: number }) {
    const qs = new URLSearchParams(sp?.toString());
    qs.set("date", next.dateKey ?? dateKey);
    qs.set("office", String(next.officeId ?? officeId));
    qs.set("duration", String(next.durationMin ?? durationMin));
    router.push(`/offices/schedule?${qs.toString()}`);
  }

  const selectedSlotSet = useMemo(() => new Set(selectedSlotStarts), [selectedSlotStarts]);

  const canAllDay = useMemo(() => {
    const dayStart = startOfDay(baseDate);
    if (dayStart < startOfDay(now)) return { ok: false, reason: "Past day" };

    const workStart = new Date(dayStart);
    workStart.setMinutes(WORK_START_MIN);
    const workEnd = new Date(dayStart);
    workEnd.setMinutes(WORK_END_MIN);

    if (workStart.getTime() < now.getTime()) return { ok: false, reason: "Starts in the past" };
    if (hasOverlap(workStart, workEnd, officeBusy)) return { ok: false, reason: "Already has bookings" };
    return { ok: true as const, reason: "" };
  }, [baseDate, now, officeBusy]);

  const selectionSummary = useMemo(() => {
    if (bookAllDay) {
      const dayStart = startOfDay(baseDate);
      const workStart = new Date(dayStart);
      workStart.setMinutes(WORK_START_MIN);
      const workEnd = new Date(dayStart);
      workEnd.setMinutes(WORK_END_MIN);

      if (!canAllDay.ok) {
        return { ok: false as const, error: `All-day booking unavailable: ${canAllDay.reason}` };
      }

      return {
        ok: true as const,
        start: workStart,
        end: workEnd,
        label: `All day (${formatTime(workStart)} – ${formatTime(workEnd)})`,
      };
    }

    if (selectedSlotStarts.length === 0) {
      return { ok: false as const, error: "Select at least one time slot." };
    }

    const starts = selectedSlotStarts
      .map((iso) => new Date(iso))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    // Validate contiguity.
    const stepMs = durationMin * 60_000;
    for (let i = 1; i < starts.length; i += 1) {
      if (starts[i].getTime() - starts[i - 1].getTime() !== stepMs) {
        return {
          ok: false as const,
          error: "Please select consecutive time slots (no gaps).",
        };
      }
    }

    const start = starts[0];
    const end = addMinutes(starts[starts.length - 1], durationMin);
    const label =
      starts.length === 1
        ? `${formatTime(start)} (${durationMin < 60 ? `${durationMin}m` : "1h"})`
        : `${formatTime(start)} – ${formatTime(end)} (${starts.length} slots)`;

    return { ok: true as const, start, end, label };
  }, [baseDate, bookAllDay, canAllDay.ok, canAllDay.reason, durationMin, selectedSlotStarts]);

  function buildAiOptions(extracted: AiExtracted) {
    const requestedDuration = extracted.durationMinutes;
    const duration = DURATIONS_MIN.includes(requestedDuration as (typeof DURATIONS_MIN)[number])
      ? (requestedDuration as number)
      : durationMin;
    const preferredOfficeId = extracted.officePreferenceId;
    const knownOfficeIds = offices.map((o) => o.id);
    const officeIds = preferredOfficeId && knownOfficeIds.includes(preferredOfficeId)
      ? [preferredOfficeId, ...knownOfficeIds.filter((id) => id !== preferredOfficeId)]
      : knownOfficeIds;
    const dateFilter = extracted.dateISO && /^\d{4}-\d{2}-\d{2}$/.test(extracted.dateISO)
      ? extracted.dateISO
      : null;
    const timeRange = extracted.timePreference ? parseTimePreference(extracted.timePreference) : null;

    const candidates: { officeId: number; start: Date }[] = [];
    for (const id of officeIds) {
      const slots = availabilityIndex.get(id)?.get(duration) ?? [];
      for (const start of slots) {
        if (dateFilter && toDateKey(start) !== dateFilter) continue;
        if (timeRange) {
          const minutes = minutesIntoDay(start);
          if (minutes < timeRange.startMin || minutes > timeRange.endMin) continue;
        }
        candidates.push({ officeId: id, start });
      }
    }

    candidates.sort((a, b) => a.start.getTime() - b.start.getTime());
    return candidates.slice(0, 3).map((slot) => {
      const officeName = officeNameById.get(slot.officeId) ?? `Office #${slot.officeId}`;
      const label = `${officeName} · ${formatDayLabel(slot.start)} at ${formatTime(slot.start)} (${formatDurationLabel(duration)})`;
      return {
        label,
        officeId: String(slot.officeId),
        startISO: slot.start.toISOString(),
        durationMinutes: duration,
      };
    });
  }

  async function handleAiSend() {
    const message = aiInput.trim();
    if (!message || aiLoading) return;

    setAiLoading(true);
    setAiError("");
    setAiBookingSuccess("");
    setAiSelectedOption(null);
    setAiMessages((prev) => [...prev, { role: "user", content: message }]);
    setAiInput("");

    try {
      const res = await fetch(withBasePath("/api/office-booking/ai"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            offices: offices.map((o) => ({ id: o.id, name: o.name })),
            availabilityContext: aiAvailabilityContext,
            uiState: { officeId, dateKey, durationMin },
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        intent?: string;
        reply?: string;
        extracted?: AiExtracted;
        options?: AiOption[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data?.error || `AI request failed (${res.status})`);
      }

      const reply = data?.reply?.trim() || "Got it. Let me check availability.";
      const extracted = data?.extracted ?? {};
      const options = Array.isArray(data?.options) ? data.options : buildAiOptions(extracted);

      setAiMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setAiOptions(options);
      if (extracted?.selectionIndex && options[extracted.selectionIndex - 1]) {
        setAiSelectedOption(options[extracted.selectionIndex - 1]);
      }
    } catch (error: any) {
      setAiError("AI isn’t available right now. You can still book manually.");
      const detail = error instanceof Error ? error.message : String(error);
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: detail || "I couldn’t reach the AI right now.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  async function submitAiBooking(option: AiOption) {
    setAiError("");
    setAiBookingSuccess("");

    if (!user) {
      setAiError("Please add your user information first.");
      setUserModalOpen(true);
      return;
    }

    const officeIdNum = Number(option.officeId);
    const start = new Date(option.startISO);
    if (!Number.isFinite(officeIdNum) || Number.isNaN(start.getTime())) {
      setAiError("Selected option is invalid.");
      return;
    }

    const end = addMinutes(start, option.durationMinutes);

    setAiBookingSubmitting(true);
    try {
      const res = await fetch(withBasePath("/api/office-booking/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officeId: officeIdNum,
          name: user.name,
          email: user.email,
          start: start.toISOString(),
          end: end.toISOString(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Failed to create booking (${res.status})`);
      }

      setAiBookingSuccess("Booked! Your reservation has been created.");
      setBookingSuccess("Booked! Your reservation has been created.");
      setSelectedSlotStarts([start.toISOString()]);
      setBookAllDay(false);

      if (officeIdNum !== officeId) {
        setOfficeId(officeIdNum);
      }
      const nextDateKey = toDateKey(start);
      if (nextDateKey !== dateKey) {
        setDateKey(nextDateKey);
      }
      if (option.durationMinutes !== durationMin) {
        setDurationMin(option.durationMinutes);
      }
      pushState({ officeId: officeIdNum, dateKey: nextDateKey, durationMin: option.durationMinutes });
      router.refresh();
    } catch (error: any) {
      setAiError(error?.message || "Failed to create booking.");
    } finally {
      setAiBookingSubmitting(false);
    }
  }

  async function submitBooking() {
    setBookingError("");
    setBookingSuccess("");

    if (!user) {
      setBookingError("Please add your user information first.");
      setUserModalOpen(true);
      return;
    }
    if (!selectedOffice) {
      setBookingError("No office selected.");
      return;
    }
    if (!selectionSummary.ok) {
      setBookingError(selectionSummary.error);
      return;
    }

    // Final guardrail (should already be handled by slot availability).
    if (selectionSummary.start.getTime() < Date.now() - 60_000) {
      setBookingError("Start time must be in the future.");
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await fetch(withBasePath("/api/office-booking/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officeId: selectedOffice.id,
          name: user.name,
          email: user.email,
          start: selectionSummary.start.toISOString(),
          end: selectionSummary.end.toISOString(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Failed to create booking (${res.status})`);
      }

      setBookingSuccess("Booked! Your reservation has been created.");
      setSelectedSlotStarts([]);
      setBookAllDay(false);
      router.refresh();
    } catch (e: any) {
      setBookingError(e?.message || "Failed to create booking.");
    } finally {
      setBookingSubmitting(false);
    }
  }

  // Load the user's bookings when opening "My Office Schedule".
  useEffect(() => {
    if (!myScheduleOpen) return;
    const email = user?.email;
    if (!email) return;
    let cancelled = false;

    async function load(emailParam: string) {
      setMyBookingsLoading(true);
      setMyBookingsError("");
      try {
        const res = await fetch(
          withBasePath(`/api/office-booking/my?email=${encodeURIComponent(emailParam)}`),
          { headers: { "Cache-Control": "no-store" } }
        );
        const data = (await res.json().catch(() => ({}))) as {
          bookings?: MyBooking[];
          error?: string;
        };
        if (!res.ok) throw new Error(data?.error || `Failed to load (${res.status})`);
        if (!cancelled) setMyBookings(Array.isArray(data.bookings) ? data.bookings : []);
      } catch (e: any) {
        if (!cancelled) setMyBookingsError(e?.message || "Failed to load your schedule.");
      } finally {
        if (!cancelled) setMyBookingsLoading(false);
      }
    }

    load(email);
    return () => {
      cancelled = true;
    };
  }, [myScheduleOpen, user?.email]);

  if (offices.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-border/70 bg-background p-6">
          <h1 className="text-xl font-semibold">Office Schedule</h1>
          <p className="mt-1 text-sm text-foreground/70">No offices found. Seed offices using Prisma Studio.</p>
        </div>
      </main>
    );
  }

  const locked = !unlocked;

  return (
    <main className="mx-auto max-w-6xl p-6">
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background px-4 text-sm font-semibold transition hover:bg-muted"
            onClick={() => setUserModalOpen(true)}
          >
            <UserRound className="h-4 w-4 text-foreground/60" />
            User information
          </button>

          <button
            type="button"
            className={
              "inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background px-4 text-sm font-semibold transition hover:bg-muted " +
              (unlocked ? "" : "opacity-50")
            }
            onClick={() => setMyScheduleOpen(true)}
            disabled={!unlocked}
          >
            <CalendarDays className="h-4 w-4 text-foreground/60" />
            My Office Schedule
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl border border-border/70 bg-background shadow-sm">
        {/* Lock overlay */}
        {locked ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/50 backdrop-blur-sm">
            <div className="mx-auto max-w-md rounded-2xl border border-border/70 bg-background p-5 text-center shadow-sm">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/30">
                <UserRound className="h-5 w-5 text-foreground/70" />
              </div>
              <div className="mt-3 text-sm font-semibold">Add your user information to schedule</div>
              <div className="mt-1 text-sm text-foreground/70">Name + email are required (no login yet).</div>
              <button
                type="button"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-border/70 bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90"
                onClick={() => setUserModalOpen(true)}
              >
                Enter user information
              </button>
            </div>
          </div>
        ) : null}

        <div className={locked ? "pointer-events-none select-none opacity-40 grayscale" : ""}>
          <div className="grid grid-cols-1 md:grid-cols-[360px_1fr]">
            {/* Left panel */}
            <section className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">Schedule a time</h1>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-background px-3 text-xs font-semibold transition hover:bg-muted"
                  onClick={() => setAiOpen(true)}
                >
                  <Sparkles className="h-4 w-4 text-foreground/60" />
                  Use AI
                </button>
              </div>

              {selectedOffice?.description ? (
                <p className="mt-3 text-sm text-foreground/70 line-clamp-4">{selectedOffice.description}</p>
              ) : (
                <p className="mt-3 text-sm text-foreground/70">Choose a duration, then pick a day and time.</p>
              )}

              <div className="mt-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-foreground/60" />
                  Duration
                </div>
                <div className="mt-3">
                  <DurationChips
                    value={durationMin}
                    onChange={(v) => {
                      setDurationMin(v);
                      pushState({ durationMin: v });
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-foreground/60">Time slots show in {durationMin} minute increments.</div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground/80">
                  <Building2 className="h-4 w-4 text-foreground/60" />
                  <div className="min-w-0">
                    <div className="font-semibold">Office</div>
                    <div className="text-xs text-foreground/60">Choose an office to book</div>
                  </div>
                </div>

                <select
                  className="h-10 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
                  value={officeId}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setOfficeId(next);
                    pushState({ officeId: next });
                  }}
                  aria-label="Select office"
                >
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Right panel */}
            <section className="border-t border-border/70 p-6 md:border-l md:border-t-0">
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold">{formatMonthLabel(monthFirst)}</div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background/80 transition hover:bg-muted"
                    onClick={() => {
                      const prev = new Date(monthFirst);
                      prev.setMonth(prev.getMonth() - 1);
                      prev.setDate(1);
                      const k = toDateKey(prev);
                      setDateKey(k);
                      pushState({ dateKey: k });
                    }}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background/80 transition hover:bg-muted"
                    onClick={() => {
                      const next = new Date(monthFirst);
                      next.setMonth(next.getMonth() + 1);
                      next.setDate(1);
                      const k = toDateKey(next);
                      setDateKey(k);
                      pushState({ dateKey: k });
                    }}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
                <div>
                  <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase tracking-wide text-foreground/60">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                      <div key={d} className="text-center">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {gridDays.map((d) => {
                      const k = toDateKey(d);
                      const inMonth = d.getMonth() === monthFirst.getMonth();
                      const isPastDay = startOfDay(d) < startOfDay(now);
                      const availableCount = inMonth ? availabilityCountByDayKey.get(k) ?? 0 : 0;
                      const hasAvailability = availableCount > 0;
                      const hasBookings = bookedDayKeys.has(k);
                      const selected = k === dateKey;
                      const showDot = hasAvailability && hasBookings;
                      const isToday = k === todayKey;

                      if (!inMonth) {
                        return <div key={k} className="h-12" aria-hidden />;
                      }

                      const baseCls =
                        "relative flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/30";

                      const enabled = !isPastDay && hasAvailability;
                      const cls =
                        baseCls +
                        " " +
                        (selected
                          ? "bg-foreground text-background"
                          : enabled
                            ? "bg-muted/40 text-foreground hover:bg-muted/60"
                            : "text-foreground/40");

                      return (
                        <button
                          key={k}
                          type="button"
                          disabled={!enabled}
                          className={cls}
                          onClick={() => {
                            setDateKey(k);
                            pushState({ dateKey: k });
                          }}
                          aria-label={
                            enabled
                              ? `Select ${formatDayLabel(d)}`
                              : isPastDay
                                ? `${formatDayLabel(d)} (past)`
                                : `${formatDayLabel(d)} (no availability)`
                          }
                        >
                          {d.getDate()}
                          {showDot ? (
                            <span
                              className={
                                "absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full " +
                                (selected ? "bg-background" : "bg-foreground/70")
                              }
                              aria-hidden
                            />
                          ) : null}
                          {isToday ? (
                            <span
                              className={
                                "absolute top-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full " +
                                (selected ? "bg-background/80" : "bg-primary/60")
                              }
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-xs text-foreground/60">
                    Working hours: {formatTime(new Date(new Date(baseDate).setMinutes(WORK_START_MIN)))} –{" "}
                    {formatTime(new Date(new Date(baseDate).setMinutes(WORK_END_MIN)))}.
                  </div>
                </div>

                {/* Times */}
                <aside className="flex flex-col">
                  <div className="text-sm font-semibold">{formatDayLabel(baseDate)}</div>
                  <div className="mt-1 text-xs text-foreground/60">
                    {selectedDayAvailableCount === 0
                      ? "No available times. Try another day."
                      : `${selectedDayAvailableCount} available • ${selectedDaySlots.length - selectedDayAvailableCount} unavailable`}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className={
                        "h-9 rounded-md border border-border/70 px-3 text-xs font-semibold transition " +
                        (bookAllDay
                          ? "bg-foreground text-background"
                          : "bg-background hover:bg-muted/40")
                      }
                      onClick={() => {
                        if (!canAllDay.ok) return;
                        setBookAllDay((v) => !v);
                        setSelectedSlotStarts([]);
                      }}
                      disabled={!canAllDay.ok}
                      aria-disabled={!canAllDay.ok}
                      title={!canAllDay.ok ? canAllDay.reason : ""}
                    >
                      Book All Day
                    </button>

                    {(bookAllDay || selectedSlotStarts.length > 0) ? (
                      <button
                        type="button"
                        className="h-9 rounded-md border border-border/70 bg-background px-3 text-xs font-semibold transition hover:bg-muted/40"
                        onClick={() => {
                          setBookAllDay(false);
                          setSelectedSlotStarts([]);
                          setBookingError("");
                          setBookingSuccess("");
                        }}
                      >
                        Clear
                      </button>
                    ) : (
                      <div className="text-[11px] text-foreground/60">Select one or more slots</div>
                    )}
                  </div>

                  <div className="mt-3 max-h-[360px] overflow-auto rounded-lg border border-border/70 bg-background">
                    <div className="grid gap-1 p-2">
                      {selectedDaySlots.map((slot) => {
                        const iso = slot.start.toISOString();
                        const selected = selectedSlotSet.has(iso);
                        const clickable = slot.status === "available" && !bookAllDay;

                        const label = formatTime(slot.start);
                        const right =
                          slot.status === "available"
                            ? selected
                              ? "Selected"
                              : "Available"
                            : slot.status === "booked"
                              ? "Booked"
                              : "Past";

                        const cls =
                          "flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm font-semibold transition " +
                          (selected
                            ? "border-foreground bg-foreground text-background"
                            : clickable
                              ? "border-border/70 bg-background hover:bg-muted/40"
                              : "border-border/50 bg-muted/20 text-foreground/50");

                        return (
                          <button
                            key={iso}
                            type="button"
                            disabled={!clickable}
                            className={cls}
                            onClick={() => {
                              if (!clickable) return;
                              setSelectedSlotStarts((prev) => {
                                if (prev.includes(iso)) return prev.filter((x) => x !== iso);
                                return [...prev, iso];
                              });
                            }}
                            aria-pressed={selected}
                          >
                            <span>{label}</span>
                            <span className={selected ? "text-background/80" : "text-foreground/60"}>{right}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-border/70 bg-background p-3">
                    <div className="text-xs text-foreground/70">
                      <span className="font-semibold">Selection:</span>{" "}
                      {selectionSummary.ok ? selectionSummary.label : selectionSummary.error}
                    </div>

                    {bookingError ? (
                      <div className="mt-2 text-xs font-semibold text-red-600">{bookingError}</div>
                    ) : null}
                    {bookingSuccess ? (
                      <div className="mt-2 text-xs font-semibold text-emerald-700">{bookingSuccess}</div>
                    ) : null}

                    <button
                      type="button"
                      className={
                        "mt-3 h-10 w-full rounded-md border border-border/70 px-3 text-sm font-semibold transition " +
                        (selectionSummary.ok && !bookingSubmitting
                          ? "bg-foreground text-background hover:opacity-90"
                          : "bg-muted/30 text-foreground/50")
                      }
                      onClick={submitBooking}
                      disabled={!selectionSummary.ok || bookingSubmitting}
                    >
                      {bookingSubmitting ? "Booking..." : "Book"}
                    </button>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* User info modal */}
      <UserInfoModal
        open={userModalOpen}
        initial={user}
        onClose={() => setUserModalOpen(false)}
        onSave={(next) => {
          setUser(next);
          try {
            window.localStorage.setItem("officeSchedule.user", JSON.stringify(next));
          } catch {
            // ignore
          }
          setUserModalOpen(false);
        }}
      />

      {/* My schedule modal */}
      <Modal
        open={myScheduleOpen}
        title="My Office Schedule"
        onClose={() => setMyScheduleOpen(false)}
      >
        {!unlocked ? (
          <div className="text-sm text-foreground/70">Add your user information first.</div>
        ) : myBookingsLoading ? (
          <div className="text-sm text-foreground/70">Loading…</div>
        ) : myBookingsError ? (
          <div className="text-sm font-semibold text-red-600">{myBookingsError}</div>
        ) : myBookings.length === 0 ? (
          <div className="text-sm text-foreground/70">No bookings found for {user?.email}.</div>
        ) : (
          <div className="grid gap-2">
            {myBookings
              .slice()
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .map((b) => {
                const s = new Date(b.start);
                const e = new Date(b.end);
                const officeName = officeNameById.get(b.officeId) ?? `Office #${b.officeId}`;
                return (
                  <div key={b.id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="text-sm font-semibold">{officeName}</div>
                    <div className="mt-1 text-xs text-foreground/70">
                      {new Intl.DateTimeFormat(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(s)}
                    </div>
                    <div className="mt-1 text-xs text-foreground/70">
                      {formatTime(s)} – {formatTime(e)}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Modal>

      <Modal open={aiOpen} title="Use AI to schedule" onClose={() => setAiOpen(false)}>
        <div className="grid gap-4">
          <div className="grid max-h-[45vh] gap-2 overflow-y-auto pr-1">
            {aiMessages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={
                  "rounded-lg px-3 py-2 text-sm " +
                  (msg.role === "assistant"
                    ? "bg-muted/40 text-foreground"
                    : "bg-foreground text-background")
                }
              >
                {msg.content}
              </div>
            ))}
            {aiLoading ? <div className="text-xs text-foreground/60">Thinking…</div> : null}
          </div>

          {aiError ? <div className="text-xs font-semibold text-red-600">{aiError}</div> : null}

          {aiOptions.length > 0 ? (
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-foreground/70">Suggested options</div>
              {aiOptions.map((option, idx) => {
                const selected = aiSelectedOption?.startISO === option.startISO;
                return (
                  <button
                    key={`${option.startISO}-${option.officeId}`}
                    type="button"
                    onClick={() => setAiSelectedOption(option)}
                    className={
                      "flex w-full items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-left text-sm transition " +
                      (selected
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-muted/30")
                    }
                    aria-pressed={selected}
                  >
                    <span className="font-semibold">{idx + 1}.</span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {aiSelectedOption ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="text-xs text-foreground/70">Selected option</div>
              <div className="mt-1 text-sm font-semibold">{aiSelectedOption.label}</div>
              {aiBookingSuccess ? (
                <div className="mt-2 text-xs font-semibold text-emerald-700">{aiBookingSuccess}</div>
              ) : null}
              <button
                type="button"
                className={
                  "mt-3 h-10 w-full rounded-md border border-border/70 px-3 text-sm font-semibold transition " +
                  (aiBookingSubmitting
                    ? "bg-muted/30 text-foreground/50"
                    : "bg-foreground text-background hover:opacity-90")
                }
                onClick={() => submitAiBooking(aiSelectedOption)}
                disabled={aiBookingSubmitting}
              >
                {aiBookingSubmitting ? "Booking..." : "Confirm booking"}
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <input
              className="h-10 flex-1 rounded-md border border-border/70 bg-background px-3 text-sm"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="e.g. Thursday afternoon for 30 minutes at Midtown"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAiSend();
                }
              }}
            />
            <button
              type="button"
              className={
                "h-10 rounded-md border border-border/70 px-4 text-sm font-semibold transition " +
                (!aiInput.trim() || aiLoading
                  ? "bg-muted/30 text-foreground/50"
                  : "bg-foreground text-background hover:opacity-90")
              }
              onClick={handleAiSend}
              disabled={!aiInput.trim() || aiLoading}
            >
              Send
            </button>
          </div>

          <div className="text-xs text-foreground/60">
            AI suggestions use your local Ollama model. If it’s unavailable, you can still book manually.
          </div>
        </div>
      </Modal>
    </main>
  );
}

function UserInfoModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: UserInfo | null;
  onClose: () => void;
  onSave: (next: UserInfo) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setError("");
  }, [open, initial?.email, initial?.name]);

  return (
    <Modal open={open} title="User information" onClose={onClose}>
      <div className="grid gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground/70">Name</label>
          <input
            className="mt-1 h-10 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground/70">Email</label>
          <input
            className="mt-1 h-10 w-full rounded-md border border-border/70 bg-background px-3 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            inputMode="email"
          />
        </div>

        {error ? <div className="text-xs font-semibold text-red-600">{error}</div> : null}

        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-md border border-border/70 bg-background px-4 text-sm font-semibold transition hover:bg-muted"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-10 rounded-md border border-border/70 bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90"
            onClick={() => {
              const n = name.trim();
              const e = email.trim();
              if (!n) return setError("Please enter your name.");
              if (!isValidEmail(e)) return setError("Please enter a valid email.");
              onSave({ name: n, email: e });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
