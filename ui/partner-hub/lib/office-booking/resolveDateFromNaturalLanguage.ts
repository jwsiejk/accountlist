const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type Confidence = "high" | "ambiguous" | "none";

export type DateResolution = {
  dateISO?: string;
  confidence: Confidence;
  reason?: "weekend" | "next_week";
  options?: { label: string; dateISO: string }[];
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDateISO(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function nextWeekday(base: Date, weekdayIndex: number) {
  const diff = (weekdayIndex - base.getDay() + 7) % 7;
  const offset = diff === 0 ? 7 : diff;
  return addDays(base, offset);
}

function nextWeekWeekday(base: Date, weekdayIndex: number) {
  const diff = (weekdayIndex - base.getDay() + 7) % 7;
  if (diff === 0) return addDays(base, 7);
  return addDays(base, diff + 7);
}

export function resolveDateFromNaturalLanguage(input: string, baseDate: Date): DateResolution {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return { confidence: "none" };

  const isoMatch = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return { dateISO: isoMatch[1], confidence: "high" };
  }

  if (normalized.includes("today")) {
    return { dateISO: toDateISO(baseDate), confidence: "high" };
  }

  if (normalized.includes("tomorrow")) {
    return { dateISO: toDateISO(addDays(baseDate, 1)), confidence: "high" };
  }

  if (normalized.includes("next week")) {
    return { confidence: "ambiguous", reason: "next_week" };
  }

  if (normalized.includes("weekend")) {
    const saturday = nextWeekday(baseDate, 6);
    const sunday = nextWeekday(baseDate, 0);
    const isNextWeekend = normalized.includes("next weekend");
    const saturdayDate = isNextWeekend ? addDays(saturday, 7) : saturday;
    const sundayDate = isNextWeekend ? addDays(sunday, 7) : sunday;
    return {
      confidence: "ambiguous",
      reason: "weekend",
      options: [
        { label: `Saturday (${toDateISO(saturdayDate)})`, dateISO: toDateISO(saturdayDate) },
        { label: `Sunday (${toDateISO(sundayDate)})`, dateISO: toDateISO(sundayDate) },
      ],
    };
  }

  for (const [index, weekday] of WEEKDAYS.entries()) {
    const nextPattern = new RegExp(`\\bnext\\s+${weekday}\\b`, "i");
    const plainPattern = new RegExp(`\\b${weekday}\\b`, "i");

    if (nextPattern.test(normalized)) {
      return { dateISO: toDateISO(nextWeekWeekday(baseDate, index)), confidence: "high" };
    }

    if (plainPattern.test(normalized)) {
      return { dateISO: toDateISO(nextWeekday(baseDate, index)), confidence: "high" };
    }
  }

  return { confidence: "none" };
}
