import type { BatchOverview, CampaignOverview, ContactRow } from "./overviewTypes";

/**
 * CSV export of a campaign's report: one row per contact, grouped by batch,
 * with when each email in the sequence went out and how the contact engaged.
 * Pure (no database access) so it's unit-testable -- see reportCsv.test.ts.
 */

export const REPORT_CSV_HEADERS = [
  "Campaign",
  "Batch",
  "First name",
  "Last name",
  "Email",
  "Company",
  "Title",
  "Email 1 sent",
  "Email 2 sent",
  "Email 3 sent",
  "Next email",
  "Next email due",
  "Opened",
  "Clicked",
  "Replied",
  "Bounced",
  "Sequence status",
  "Last activity",
] as const;

/**
 * Cells starting with = + - @ (or a tab/CR) are interpreted as formulas by
 * Excel/Sheets. Contact fields come from imported CSVs, so a hostile or
 * careless value like `=HYPERLINK(...)` in a Company cell would otherwise run
 * when a rep opens this report. Prefixing a single quote makes it plain text.
 */
function safeCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function formatWhen(date: Date | null, timeZone: string): string {
  if (!date) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} ${get("timeZoneName")}`;
  } catch {
    return date.toISOString();
  }
}

/** Short calendar day, e.g. "Oct 4", in the given time zone. */
export function formatDay(date: Date | null, timeZone: string): string {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

const SEQUENCE_STATUS_LABEL: Record<ContactRow["sequence"]["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete (3 of 3 sent)",
  replied: "Replied",
  bounced: "Bounced",
};

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export function contactReportCells(campaignName: string, batchName: string, c: ContactRow, timeZone: string): string[] {
  const [s1, s2, s3] = c.sequence.steps;
  const next = c.sequence.nextStep ? c.sequence.steps[c.sequence.nextStep - 1] : null;
  return [
    campaignName,
    batchName,
    c.firstName,
    c.lastName ?? "",
    c.email,
    c.company ?? "",
    c.title ?? "",
    formatWhen(s1.sentAt, timeZone),
    formatWhen(s2.sentAt, timeZone),
    formatWhen(s3.sentAt, timeZone),
    c.sequence.nextStep ? `Email ${c.sequence.nextStep}` : "",
    next ? (next.state === "due" ? "Now" : formatWhen(next.dueAt, timeZone)) : "",
    yesNo(c.engagement.opened),
    yesNo(c.engagement.clicked),
    yesNo(c.engagement.replied),
    yesNo(c.status === "BOUNCED"),
    SEQUENCE_STATUS_LABEL[c.sequence.status],
    formatWhen(c.lastActivityAt, timeZone),
  ];
}

export function buildReportCsv(overview: CampaignOverview, timeZone = "UTC", only?: BatchOverview[]): string {
  const batches = only ?? overview.batches;
  const lines: string[] = [REPORT_CSV_HEADERS.map(csvField).join(",")];
  for (const batch of batches) {
    for (const contact of batch.contacts) {
      const cells = contactReportCells(overview.campaign.name, batch.name, contact, timeZone).map((cell) =>
        csvField(safeCell(cell))
      );
      lines.push(cells.join(","));
    }
  }
  // CRLF + leading BOM: opens correctly (accents, "é") in Excel without the import wizard.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
