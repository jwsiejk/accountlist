import Link from "next/link";
import events from "@/data/events.json";

const formatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

type EventItem = {
  title: string;
  date: string;
  region: string;
  owner: string;
  href: string;
};

const typedEvents = events as EventItem[];

const upcomingEvents = typedEvents
  .slice()
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

export function EventsMini() {
  const now = Date.now();
  const nextEvents = upcomingEvents
    .filter((event) => new Date(event.date).getTime() >= now)
    .slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
          Events
        </h3>
        <Link href="/marketing" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      <ul className="space-y-3">
        {nextEvents.map((event) => (
          <li key={event.href} className="text-sm">
            <Link href={event.href} className="group block">
              <p className="font-medium group-hover:text-primary">{event.title}</p>
              <p className="text-xs text-foreground/60">
                {formatter.format(new Date(event.date))} • {event.region} • {event.owner}
              </p>
            </Link>
          </li>
        ))}
        {nextEvents.length === 0 ? (
          <li className="text-xs text-foreground/60">No upcoming events.</li>
        ) : null}
      </ul>
    </div>
  );
}
