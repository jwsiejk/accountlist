import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  linkLabel,
  rewriteLinksForTracking,
  trackedLinkUrl,
  verifiedDestination,
  type Signer,
} from "./linkTracking";

const sign: Signer = (data) => crypto.createHmac("sha256", "test-secret").update(data).digest("base64url").slice(0, 22);
const BASE = "https://app.example.com/partner-hub/api/outreach/track/click";
const TOKEN = "abc123.sig";

function hrefs(html: string): string[] {
  return Array.from(html.matchAll(/href="([^"]*)"/g)).map((m) => m[1].replace(/&amp;/g, "&"));
}

test("rewrites http(s) links to signed tracked URLs that verify back to the original", () => {
  const html = `<p><a href="https://www.gartner.com/en/newsroom?x=1&amp;y=2" style="color:#777;">Gartner</a> and <a href='http://cnbc.com/a'>CNBC</a></p>`;
  const { html: out, tracked } = rewriteLinksForTracking(html, TOKEN, BASE, sign);
  assert.deepEqual(tracked, ["https://www.gartner.com/en/newsroom?x=1&y=2", "http://cnbc.com/a"]);
  assert.ok(out.includes('style="color:#777;"'), "other attributes are kept");
  assert.ok(out.includes(">Gartner</a>") && out.includes(">CNBC</a>"), "link text is kept");

  const first = new URL(hrefs(out)[0]);
  assert.equal(first.origin + first.pathname, `${BASE}/${TOKEN}`);
  assert.equal(
    verifiedDestination(TOKEN, first.searchParams.get("u"), first.searchParams.get("s"), sign),
    "https://www.gartner.com/en/newsroom?x=1&y=2"
  );
});

test("leaves mailto, tel, anchors, existing tracked links and comments alone", () => {
  const booking = `<a href="${BASE}/${TOKEN}">book a meeting with DDN here</a>`;
  const html = [
    `<a href="mailto:jsiejk@ddn.com">email</a>`,
    `<a href="tel:+15555550100">call</a>`,
    `<a href="#top">top</a>`,
    booking,
    `<!-- <a href="https://example.com/in-comment">x</a> -->`,
  ].join("\n");
  const { html: out, tracked } = rewriteLinksForTracking(html, TOKEN, BASE, sign);
  assert.equal(out, html);
  assert.deepEqual(tracked, []);
});

test("a tampered or missing signature is rejected (no open redirect)", () => {
  const url = new URL(trackedLinkUrl(BASE, TOKEN, "https://ddn.com/", sign));
  const s = url.searchParams.get("s");
  assert.equal(verifiedDestination(TOKEN, "https://ddn.com/", s, sign), "https://ddn.com/");
  assert.equal(verifiedDestination(TOKEN, "https://evil.example/", s, sign), null, "different destination");
  assert.equal(verifiedDestination("other.token", "https://ddn.com/", s, sign), null, "different recipient");
  assert.equal(verifiedDestination(TOKEN, "https://ddn.com/", null, sign), null, "no signature");
  assert.equal(verifiedDestination(TOKEN, "javascript:alert(1)", sign(`link:${TOKEN}\njavascript:alert(1)`), sign), null);
});

test("linkLabel gives a short readable destination", () => {
  assert.equal(linkLabel("https://www.cnbc.com/2026/10/14/dell.html"), "cnbc.com/2026/10/14/dell.html");
  assert.equal(linkLabel("https://sc26.supercomputing.org/"), "sc26.supercomputing.org");
  assert.ok(linkLabel("https://example.com/" + "a".repeat(80)).endsWith("…"));
});
