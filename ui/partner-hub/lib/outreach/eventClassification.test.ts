import assert from "node:assert/strict";
import test from "node:test";

import { chromiumVersion, classifyTrackingEvent, expectedChromiumVersion } from "./eventClassification";
import { reclassifyEvents, statusFromHistory, type StoredTrackingEvent } from "./reclassify";

// User-agents seen in production (Sept/Oct 2026).
const UA = {
  // The campaign owner, testing on their own mailbox -- real people.
  ownerEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0",
  ownerAndroid:
    "Mozilla/5.0 (Linux; Android 16; SM-S921U Build/BP4A.251205.006; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/154.0.8037.57 Mobile Safari/537.36",
  outlookDesktop: "Mozilla/4.0 (compatible; ms-office; MSOffice 16)",
  // Scanners.
  safeLinks: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
  eveningLinux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  eveningWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  python: "python-requests/2.33.1",
};

const dispatchedAt = new Date("2026-10-01T14:07:22Z");
const at = (iso: string) => new Date(iso);

test("chromium version parsing and the expected current version", () => {
  assert.equal(chromiumVersion(UA.ownerEdge), 153);
  assert.equal(chromiumVersion(UA.ownerAndroid), 154);
  assert.equal(chromiumVersion(UA.outlookDesktop), null);
  assert.equal(expectedChromiumVersion(at("2026-09-22T00:00:00Z")), 153);
  assert.equal(expectedChromiumVersion(at("2026-10-01T00:00:00Z")), 153);
  assert.equal(expectedChromiumVersion(at("2026-11-20T00:00:00Z")), 155);
});

test("real people hours after delivery are real", () => {
  for (const ua of [UA.ownerEdge, UA.ownerAndroid, UA.outlookDesktop]) {
    const r = classifyTrackingEvent({ dispatchedAt, occurredAt: at("2026-10-01T16:30:00Z"), userAgent: ua });
    assert.equal(r.automated, false, ua);
  }
});

test("scripts and missing user-agents are automated", () => {
  assert.equal(classifyTrackingEvent({ dispatchedAt, occurredAt: at("2026-10-01T16:00:00Z"), userAgent: UA.python }).automated, true);
  assert.equal(classifyTrackingEvent({ dispatchedAt, occurredAt: at("2026-10-01T16:00:00Z") }).automated, true);
  assert.equal(
    classifyTrackingEvent({ dispatchedAt, occurredAt: at("2026-10-01T16:00:00Z"), userAgent: "curl/8.5.0" }).automated,
    true
  );
});

test("out-of-date browsers are automated at any time", () => {
  for (const ua of [UA.safeLinks, UA.eveningLinux, UA.eveningWindows]) {
    const r = classifyTrackingEvent({ dispatchedAt, occurredAt: at("2026-10-01T23:03:32Z"), userAgent: ua });
    assert.equal(r.automated, true, ua);
  }
});

test("anything within 15 minutes of sending is automated, even a current browser", () => {
  const r = classifyTrackingEvent({ dispatchedAt, occurredAt: at("2026-10-01T14:15:00Z"), userAgent: UA.ownerEdge });
  assert.equal(r.automated, true);
});

test("same network address at another company is automated", () => {
  const r = classifyTrackingEvent({
    dispatchedAt,
    occurredAt: at("2026-10-01T20:00:00Z"),
    userAgent: UA.ownerEdge,
    ip: "40.94.1.2",
    recipientDomain: "gsk.com",
    crossRecipientEvents: [{ occurredAt: at("2026-10-01T19:00:00Z"), ip: "40.94.1.2", recipientDomain: "abbott.com" }],
  });
  assert.equal(r.automated, true);
});

test("identical browser at two other companies within 2 hours is automated; at one is not", () => {
  const base = { dispatchedAt, occurredAt: at("2026-10-01T20:00:00Z"), userAgent: UA.ownerEdge, recipientDomain: "gsk.com" };
  const one = [{ occurredAt: at("2026-10-01T19:30:00Z"), userAgent: UA.ownerEdge, recipientDomain: "abbott.com" }];
  const two = [...one, { occurredAt: at("2026-10-01T19:45:00Z"), userAgent: UA.ownerEdge, recipientDomain: "humana.com" }];
  assert.equal(classifyTrackingEvent({ ...base, crossRecipientEvents: one }).automated, false);
  assert.equal(classifyTrackingEvent({ ...base, crossRecipientEvents: two }).automated, true);
});

test("a hit within 15 minutes of an automated scan on the same email is automated", () => {
  const r = classifyTrackingEvent({
    dispatchedAt,
    occurredAt: at("2026-10-01T23:09:40Z"),
    userAgent: UA.ownerEdge,
    priorEvents: [{ occurredAt: at("2026-10-01T23:03:32Z"), automated: true }],
  });
  assert.equal(r.automated, true);
});

function stored(id: number, messageId: number, type: "OPEN" | "CLICK", iso: string, ua: string, domain: string, automated: boolean): StoredTrackingEvent {
  return {
    id,
    messageId,
    prospectId: messageId,
    type,
    occurredAt: at(iso),
    userAgent: ua,
    automated,
    dispatchedAt,
    confirmedSentAt: at("2026-10-01T14:08:00Z"),
    recipientDomain: domain,
  };
}

test("reclassifying the Oct 1 history flags the evening wave and the python clicks", () => {
  const events = [
    // Simon Close (gsk.com): delivery scans, then the evening wave.
    stored(1, 11, "CLICK", "2026-10-01T14:08:07Z", UA.safeLinks, "gsk.com", true),
    stored(2, 11, "CLICK", "2026-10-01T23:03:32Z", UA.eveningLinux, "gsk.com", false),
    stored(3, 11, "CLICK", "2026-10-01T23:09:40Z", UA.eveningWindows, "gsk.com", false),
    stored(4, 11, "OPEN", "2026-10-02T00:18:17Z", UA.eveningLinux, "gsk.com", false),
    stored(5, 11, "OPEN", "2026-10-02T00:19:20Z", UA.eveningWindows, "gsk.com", false),
    // Wei Zheng (modernatx.com): python-requests 10-25 min after send.
    stored(6, 17, "CLICK", "2026-10-01T14:24:22Z", UA.python, "modernatx.com", false),
    stored(7, 17, "CLICK", "2026-10-01T14:31:53Z", UA.python, "modernatx.com", false),
    // A real open from the owner's phone, a day later.
    stored(8, 1, "OPEN", "2026-10-02T16:51:11Z", UA.ownerAndroid, "ddn.com", false),
  ];
  const verdicts = reclassifyEvents(events);
  const byId = new Map(verdicts.map((v) => [v.id, v]));
  for (const id of [1, 2, 3, 4, 5, 6, 7]) assert.equal(byId.get(id)!.automated, true, `event ${id}`);
  assert.equal(byId.get(8)!.automated, false);
  assert.equal(verdicts.filter((v) => v.changed).length, 6);
});

test("statusFromHistory only recomputes SENT/OPENED/CLICKED", () => {
  assert.equal(statusFromHistory("CLICKED", [{ type: "CLICK", automated: true }]), "SENT");
  assert.equal(statusFromHistory("CLICKED", [{ type: "OPEN", automated: false }, { type: "CLICK", automated: true }]), "OPENED");
  assert.equal(statusFromHistory("OPENED", [{ type: "CLICK", automated: false }]), "CLICKED");
  assert.equal(statusFromHistory("REPLIED", [{ type: "CLICK", automated: true }]), "REPLIED");
  assert.equal(statusFromHistory("SENDING", []), "SENDING");
});
