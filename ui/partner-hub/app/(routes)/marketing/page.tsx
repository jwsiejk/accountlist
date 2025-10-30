import Link from "next/link";
import events from "@/data/events.json";

type EventItem = { title: string; date: string; region: string; owner: string; href: string };

const typedEvents = events as EventItem[];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrid(reference: Date) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDay = new Date(year, month, 1);
  const leading = firstDay.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - leading + 1;
    return dayNumber > 0 && dayNumber <= totalDays ? dayNumber : null;
  });
  const eventDays = new Set(
    typedEvents
      .filter((event) => {
        const date = new Date(event.date);
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map((event) => new Date(event.date).getDate()),
  );
  return { cells, eventDays, month, year };
}

const formatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const listFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default function MarketingPage() {
  const reference = new Date();
  const { cells, eventDays, month, year } = buildMonthGrid(reference);
  const upcoming = typedEvents
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter((event) => new Date(event.date).getTime() >= Date.now())
    .slice(0, 3);

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Marketing Programs</h1>
        <p className="text-sm text-foreground/70">
          Launch kits, co-brand assets, and campaign calendars will surface in this view.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{formatter.format(reference)}</h2>
            <span className="text-xs uppercase tracking-wide text-foreground/50">Trace3 × Pure</span>
          </div>
          <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold uppercase text-foreground/50">
            {dayNames.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
            {cells.map((day, index) => (
              <div
                key={`${month}-${year}-${index}`}
                className="flex h-14 items-center justify-center rounded-lg border border-transparent bg-muted/40"
              >
                {day ? (
                  <span className="relative font-medium text-foreground">
                    {day}
                    {eventDays.has(day) ? (
                      <span className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary" aria-hidden />
                    ) : null}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <aside className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">Upcoming Events</h2>
          <ul className="space-y-4 text-sm">
            {upcoming.map((event) => (
              <li key={event.href} className="rounded-xl border border-border bg-background p-3 shadow-sm">
                <Link href={event.href} className="block">
                  <p className="font-medium text-primary hover:underline">{event.title}</p>
                  <p className="text-xs text-foreground/60">
                    {listFormatter.format(new Date(event.date))} • {event.region} • {event.owner}
                  </p>
                </Link>
              </li>
            ))}
            {upcoming.length === 0 ? <li className="text-xs text-foreground/60">No upcoming events.</li> : null}
          </ul>
        </aside>
      </div>
    </section>
  );
}
