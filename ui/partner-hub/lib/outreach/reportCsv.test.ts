import assert from "node:assert/strict";
import test from "node:test";

import { buildReportCsv, REPORT_CSV_HEADERS } from "./reportCsv";
import { computeSequence, summarizeBatch, type ProspectStatusName } from "./sequence";
import type { CampaignOverview, ContactRow } from "./overviewTypes";

const NOW = new Date("2026-10-10T16:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function contact(over: Partial<ContactRow> & { status: ProspectStatusName; sent?: number[] }): ContactRow {
  const { sent, ...rest } = over;
  const messages = (sent ?? []).map((daysAgo, i) => ({
    step: i + 1,
    sentAt: new Date(NOW.getTime() - daysAgo * DAY),
    createdAt: new Date(NOW.getTime() - daysAgo * DAY),
  }));
  return {
    id: 1,
    batchId: 1,
    email: "a@example.com",
    firstName: "Ada",
    lastName: "Lovelace",
    company: "Analytical Engines",
    title: null,
    sequence: computeSequence({ status: rest.status, messages }, undefined, NOW),
    engagement: { opened: false, clicked: false, replied: false },
    lastActivityAt: null,
    createdAt: NOW,
    ...rest,
  };
}

/** Minimal RFC 4180 row parser (quoted fields, "" escapes) so tests read real columns. */
function parseRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function overviewOf(contacts: ContactRow[]): CampaignOverview {
  return {
    campaign: { id: 1, name: "SC26, Round 2", description: null, email2DelayDays: 3, email3DelayDays: 4 },
    batches: [{ id: 1, name: "Batch 1", createdAt: NOW, contacts, summary: summarizeBatch(contacts) }],
    summary: summarizeBatch(contacts),
  };
}

test("one header row plus one row per contact, with a column for each header", () => {
  const csv = buildReportCsv(overviewOf([contact({ status: "SENT", sent: [5] }), contact({ status: "PENDING", email: "b@example.com" })]), "UTC");
  const rows = csv.replace("﻿", "").trim().split("\r\n");
  assert.equal(rows.length, 3);
  assert.equal(rows[0], REPORT_CSV_HEADERS.join(","));
});

test("sent times are formatted in the requested time zone; unsent emails are blank", () => {
  const csv = buildReportCsv(overviewOf([contact({ status: "SENT", sent: [5] })]), "America/New_York");
  const fields = parseRow(csv.trim().split("\r\n")[1]);
  assert.equal(fields[7], "2026-10-05 12:00 EDT"); // 16:00Z - 5d = 12:00 EDT
  assert.equal(fields[8], ""); // Email 2 sent
  assert.equal(fields[9], ""); // Email 3 sent
});

test("next email and due status are reported", () => {
  const due = buildReportCsv(overviewOf([contact({ status: "SENT", sent: [5] })]), "UTC").trim().split("\r\n").slice(1).map(parseRow)[0];
  assert.equal(due[10], "Email 2");
  assert.equal(due[11], "Now");
});

test("fields with commas and quotes are quoted correctly", () => {
  const csv = buildReportCsv(overviewOf([contact({ status: "PENDING", company: 'Acme, "Inc"' })]), "UTC");
  assert.ok(csv.includes('"SC26, Round 2"'));
  assert.ok(csv.includes('"Acme, ""Inc"""'));
});

test("spreadsheet formula injection in imported fields is neutralised", () => {
  const csv = buildReportCsv(
    overviewOf([contact({ status: "PENDING", firstName: "=HYPERLINK(\"http://evil\")", company: "@SUM(1)", title: "+1", lastName: "-2" })]),
    "UTC"
  );
  const row = csv.trim().split("\r\n")[1];
  assert.ok(!/(^|,)=/.test(row) && !/(^|,)"=/.test(row), "no cell may start with =");
  assert.ok(row.includes("'=HYPERLINK"));
  assert.ok(row.includes("'@SUM(1)"));
  assert.ok(row.includes("'+1"));
  assert.ok(row.includes("'-2"));
});

test("replied contacts show Yes and the stopped sequence status", () => {
  const csv = buildReportCsv(
    overviewOf([contact({ status: "REPLIED", sent: [6], engagement: { opened: true, clicked: false, replied: true } })]),
    "UTC"
  );
  const fields = parseRow(csv.trim().split("\r\n")[1]);
  assert.deepEqual(fields.slice(12, 17), ["Yes", "No", "Yes", "No", "Replied"]);
  assert.equal(fields[10], ""); // no next email once they replied
});
