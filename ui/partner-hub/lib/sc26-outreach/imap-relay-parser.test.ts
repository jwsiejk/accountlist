import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { htmlToPlainText, parseRelayNotification, parseSendConfirmation } from "./imap-relay-parser";

describe("parseRelayNotification", () => {
  it("parses the standard labeled format", () => {
    const body = [
      "FROM: prospect@example.com",
      "SUBJECT: RE: DDN at Supercomputing 2026 (SC26) -- let's connect in Chicago",
      "RECEIVED: 2026-09-18T14:32:00Z",
      "",
      "Sounds great, does Tuesday afternoon work?",
    ].join("\n");

    const result = parseRelayNotification(body);
    assert.ok(result);
    assert.equal(result?.fromEmail, "prospect@example.com");
    assert.equal(result?.fromName, null);
    assert.match(result?.subject ?? "", /Supercomputing 2026/);
    assert.equal(result?.receivedAt?.toISOString(), "2026-09-18T14:32:00.000Z");
  });

  it("is case-insensitive on labels and tolerant of extra spacing", () => {
    const body = "from  :   prospect@example.com\nsubject:Re: SC26\nreceived:2026-09-18T14:32:00Z\n";
    const result = parseRelayNotification(body);
    assert.equal(result?.fromEmail, "prospect@example.com");
  });

  it("extracts the address out of 'Name <email>' form and lowercases it", () => {
    const body = "FROM: Jane Prospect <Jane.Prospect@Example.COM>\nSUBJECT: RE: SC26\n";
    const result = parseRelayNotification(body);
    assert.equal(result?.fromEmail, "jane.prospect@example.com");
    assert.equal(result?.fromName, "Jane Prospect");
  });

  it("handles CRLF line endings", () => {
    const body = "FROM: prospect@example.com\r\nSUBJECT: RE: SC26\r\n";
    const result = parseRelayNotification(body);
    assert.equal(result?.fromEmail, "prospect@example.com");
  });

  it("keeps the first FROM line if the original message is quoted further down", () => {
    const body = [
      "FROM: prospect@example.com",
      "SUBJECT: RE: SC26",
      "RECEIVED: 2026-09-18T14:32:00Z",
      "",
      "Sounds good.",
      "",
      "On Thu, Sep 18, 2026, DDN Sales <jsiejk@ddn.com> wrote:",
      "FROM: jsiejk@ddn.com",
    ].join("\n");

    const result = parseRelayNotification(body);
    assert.equal(result?.fromEmail, "prospect@example.com");
  });

  it("returns null when there is no FROM line at all", () => {
    const body = "SUBJECT: RE: SC26\nRECEIVED: 2026-09-18T14:32:00Z\n";
    assert.equal(parseRelayNotification(body), null);
  });

  it("returns null when the FROM value has no email-shaped token", () => {
    const body = "FROM: not an email\nSUBJECT: RE: SC26\n";
    assert.equal(parseRelayNotification(body), null);
  });

  it("returns null for empty or missing input", () => {
    assert.equal(parseRelayNotification(""), null);
    assert.equal(parseRelayNotification(null), null);
    assert.equal(parseRelayNotification(undefined), null);
  });

  it("treats an unparseable RECEIVED value as null rather than throwing", () => {
    const body = "FROM: prospect@example.com\nRECEIVED: not-a-date\n";
    const result = parseRelayNotification(body);
    assert.equal(result?.fromEmail, "prospect@example.com");
    assert.equal(result?.receivedAt, null);
  });
});

describe("htmlToPlainText", () => {
  it("strips tags and converts common breaks/entities", () => {
    const html = "<p>FROM: prospect@example.com<br>SUBJECT: RE: SC26</p><p>Thanks &amp; regards</p>";
    const text = htmlToPlainText(html);
    assert.match(text, /FROM: prospect@example\.com/);
    assert.match(text, /SUBJECT: RE: SC26/);
    assert.match(text, /Thanks & regards/);
  });

  it("returns an empty string for empty/missing input", () => {
    assert.equal(htmlToPlainText(""), "");
    assert.equal(htmlToPlainText(null), "");
    assert.equal(htmlToPlainText(undefined), "");
  });
});

describe("parseSendConfirmation", () => {
  it("parses TOKEN and CONFIRMED_AT", () => {
    const body = "TOKEN: abc123.def456\nCONFIRMED_AT: 2026-09-18T14:32:00Z\n";
    const result = parseSendConfirmation(body);
    assert.ok(result);
    assert.equal(result?.token, "abc123.def456");
    assert.equal(result?.confirmedAt?.toISOString(), "2026-09-18T14:32:00.000Z");
  });

  it("is case-insensitive and tolerant of extra spacing", () => {
    const body = "token  :   abc123.def456\nconfirmed_at:2026-09-18T14:32:00Z\n";
    const result = parseSendConfirmation(body);
    assert.equal(result?.token, "abc123.def456");
  });

  it("handles CRLF line endings", () => {
    const body = "TOKEN: abc123.def456\r\nCONFIRMED_AT: 2026-09-18T14:32:00Z\r\n";
    const result = parseSendConfirmation(body);
    assert.equal(result?.token, "abc123.def456");
  });

  it("only requires TOKEN -- CONFIRMED_AT is optional context", () => {
    const result = parseSendConfirmation("TOKEN: abc123.def456\n");
    assert.ok(result);
    assert.equal(result?.token, "abc123.def456");
    assert.equal(result?.confirmedAt, null);
  });

  it("treats an unparseable CONFIRMED_AT as null rather than throwing", () => {
    const result = parseSendConfirmation("TOKEN: abc123.def456\nCONFIRMED_AT: not-a-date\n");
    assert.equal(result?.token, "abc123.def456");
    assert.equal(result?.confirmedAt, null);
  });

  it("returns null when there is no TOKEN line", () => {
    assert.equal(parseSendConfirmation("CONFIRMED_AT: 2026-09-18T14:32:00Z\n"), null);
  });

  it("returns null for empty or missing input", () => {
    assert.equal(parseSendConfirmation(""), null);
    assert.equal(parseSendConfirmation(null), null);
    assert.equal(parseSendConfirmation(undefined), null);
  });

  it("does not cross-match a reply notification's FROM/SUBJECT/RECEIVED fields", () => {
    const replyBody = "FROM: prospect@example.com\nSUBJECT: RE: SC26\nRECEIVED: 2026-09-18T14:32:00Z\n";
    assert.equal(parseSendConfirmation(replyBody), null);
  });
});
