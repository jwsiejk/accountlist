import type { BatchOverview, CampaignOverview, ContactRow } from "./overviewTypes";
import type { BatchSummary } from "./sequence";
import { formatDay, formatWhen } from "./reportCsv";

/**
 * Plain-text version of the campaign report, written to be pasted straight
 * into an email or chat message to account reps: overall counts, then per
 * batch the counts followed by each contact and what happened with them.
 * Pure (no database access) -- see reportText.test.ts.
 */

function summaryLine(s: BatchSummary): string {
  return [
    `Email 1 sent ${s.sentByStep[0]}`,
    `Email 2 sent ${s.sentByStep[1]}`,
    `Email 3 sent ${s.sentByStep[2]}`,
    `Opened ${s.opened}`,
    `Clicked ${s.clicked}`,
    `Replied ${s.replied}`,
    `Bounced ${s.bounced}`,
  ].join(" · ");
}

function contactLine(c: ContactRow, timeZone: string): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  const who = c.company ? `${name} (${c.company})` : name;

  const sent = c.sequence.steps.map((s) => (s.sentAt ? `Email ${s.step} ${formatDay(s.sentAt, timeZone)}` : null)).filter(Boolean);
  const parts: string[] = [sent.length ? sent.join(", ") : "Not emailed yet"];

  const flags: string[] = [];
  if (c.engagement.opened) flags.push("opened");
  if (c.engagement.clicked) flags.push("clicked");
  if (c.engagement.replied) flags.push("REPLIED");
  if (c.status === "BOUNCED") flags.push("BOUNCED");
  if (flags.length) parts.push(flags.join(", "));

  const next = c.sequence.nextStep ? c.sequence.steps[c.sequence.nextStep - 1] : null;
  if (next) {
    parts.push(next.state === "due" ? `Email ${next.step} due now` : `Email ${next.step} due ${formatDay(next.dueAt, timeZone)}`);
  }

  return `  • ${who} — ${parts.join(" | ")}`;
}

function batchBlock(batch: BatchOverview, timeZone: string): string {
  const count = `${batch.contacts.length} contact${batch.contacts.length === 1 ? "" : "s"}`;
  const lines = [`${batch.name.toUpperCase()} — ${count}`, summaryLine(batch.summary)];
  for (const c of batch.contacts) lines.push(contactLine(c, timeZone));
  return lines.join("\n");
}

export function buildReportText(overview: CampaignOverview, timeZone = "UTC", only?: BatchOverview[], now: Date = new Date()): string {
  const batches = only ?? overview.batches;
  const header = [
    `${overview.campaign.name} — outreach report`,
    `As of ${formatWhen(now, timeZone)}`,
    "",
  ];

  const total = batches.reduce((n, b) => n + b.contacts.length, 0);
  const overall = only
    ? []
    : [
        `OVERALL — ${total} contact${total === 1 ? "" : "s"} in ${overview.batches.length} batch${overview.batches.length === 1 ? "" : "es"}`,
        summaryLine(overview.summary),
        "",
      ];

  const body = batches.map((b) => batchBlock(b, timeZone)).join("\n\n");
  return [...header, ...overall, body].join("\n").trimEnd() + "\n";
}
