import assert from "node:assert/strict";
import test from "node:test";

import { buildReportText } from "./reportText";
import { computeSequence, summarizeBatch, type ProspectStatusName } from "./sequence";
import type { CampaignOverview, ContactRow } from "./overviewTypes";

const NOW = new Date("2026-10-10T16:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function contact(id: number, firstName: string, status: ProspectStatusName, sentDaysAgo: number[], extra: Partial<ContactRow> = {}): ContactRow {
  const messages = sentDaysAgo.map((d, i) => ({
    step: i + 1,
    sentAt: new Date(NOW.getTime() - d * DAY),
    createdAt: new Date(NOW.getTime() - d * DAY),
  }));
  return {
    id,
    batchId: 1,
    email: `${firstName.toLowerCase()}@example.com`,
    firstName,
    lastName: "Test",
    company: "Acme",
    title: null,
    status,
    sequence: computeSequence({ status, messages }, undefined, NOW),
    engagement: { opened: false, clicked: false, replied: false },
    lastActivityAt: null,
    createdAt: NOW,
    ...extra,
  };
}

function overviewOf(batches: { name: string; contacts: ContactRow[] }[]): CampaignOverview {
  const all = batches.flatMap((b) => b.contacts);
  return {
    campaign: { id: 1, name: "SC26", description: null, email2DelayDays: 3, email3DelayDays: 4 },
    batches: batches.map((b, i) => ({ id: i + 1, name: b.name, createdAt: NOW, contacts: b.contacts, summary: summarizeBatch(b.contacts) })),
    summary: summarizeBatch(all),
  };
}

test("report text has an overall block, then each batch with counts and its contacts", () => {
  const text = buildReportText(
    overviewOf([
      { name: "Batch 1", contacts: [contact(1, "Ada", "REPLIED", [9], { engagement: { opened: true, clicked: false, replied: true } }), contact(2, "Bo", "SENT", [5])] },
      { name: "Batch 2", contacts: [contact(3, "Cy", "PENDING", [])] },
    ]),
    "UTC",
    undefined,
    NOW
  );
  assert.match(text, /^SC26 — outreach report\nAs of 2026-10-10 16:00 UTC/);
  assert.match(text, /OVERALL — 3 contacts in 2 batches\nEmail 1 sent 2 · Email 2 sent 0/);
  assert.match(text, /BATCH 1 — 2 contacts/);
  assert.match(text, /BATCH 2 — 1 contact\n/);
  assert.match(text, /• Ada Test \(Acme\) — Email 1 Oct 1 \| opened, REPLIED/);
  assert.match(text, /• Bo Test \(Acme\) — Email 1 Oct 5 \| Email 2 due now/);
  assert.match(text, /• Cy Test \(Acme\) — Not emailed yet \| Email 1 due now/);
});

test("a single-batch report omits the overall block", () => {
  const ov = overviewOf([{ name: "Batch 1", contacts: [contact(1, "Ada", "SENT", [1])] }]);
  const text = buildReportText(ov, "UTC", [ov.batches[0]], NOW);
  assert.ok(!text.includes("OVERALL"));
  assert.match(text, /Email 2 due Oct 12/); // sent Oct 9 + 3 days
});
