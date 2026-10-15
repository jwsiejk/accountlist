import assert from "node:assert/strict";
import test from "node:test";

import {
  docxXmlToHtml,
  extractFromHtmlDocument,
  importPastedContent,
  isBookingUrl,
  looksLikeHtml,
  normalizePlaceholders,
  plainTextToHtml,
  prepareForSending,
  unwrapTrackedUrl,
} from "./templateImport";

const PASTED = `Hi [First Name],
I'm following up on my last note about Supercomputing 2026. If you're planning to be in Chicago November 15 to 20, James and I would like to meet.
Whatever fits your schedule best:

* Coffee at the show. A casual 20 to 30 minute introduction.
* Lunch or dinner. A more relaxed conversation.

Just reply with the days that work for you.
If your schedule is already packed, you can also book time directly through our SC26 page: https://vw9jhtlx.r.us-east-1.awstrack.me/L0/https:%2F%2Foutreach-bg3g.onrender.com%2Fpartner-hub%2F…
Either way, we hope to see you at SC26.
Thanks, Marc and James`;

test("a pasted plain-text email becomes sendable HTML with merge fields and tracking", () => {
  const r = importPastedContent(PASTED);
  assert.match(r.html, /^<p>Hi \{\{FIRST_NAME\}\},<\/p>/);
  assert.match(r.html, /<ul>\n  <li>Coffee at the show\. A casual 20 to 30 minute introduction\.<\/li>\n  <li>Lunch or dinner\./);
  assert.match(r.html, /our SC26 page: \{\{BOOKING_LINK\}\}<\/p>/);
  assert.doesNotMatch(r.html, /awstrack/);
  assert.match(r.html, /<p>Thanks,<br>Marc and James<\/p>/);
  assert.match(r.html, /\{\{TRACKING_PIXEL\}\}$/);
  assert.ok(r.notes.some((n) => n.includes("[First Name] → {{FIRST_NAME}}")));
});

test("merge-field spellings people use are normalized; unknown ones are left alone", () => {
  assert.equal(
    normalizePlaceholders("[FirstName] {Last Name} <<Company>> {{first_name}} %SENDER_NAME% [Booth]"),
    "{{FIRST_NAME}} {{LAST_NAME}} {{COMPANY}} {{FIRST_NAME}} {{SENDER_NAME}} [Booth]"
  );
  assert.equal(normalizePlaceholders("{{FIRST_NAME}}"), "{{FIRST_NAME}}");
  assert.equal(normalizePlaceholders("p { color: red }"), "p { color: red }");
});

test("click-tracker wrappers are unwrapped and booking links recognized", () => {
  assert.equal(
    unwrapTrackedUrl("https://x.r.us-east-1.awstrack.me/L0/https:%2F%2Fwww.ddn.com%2Fevents/1/abc"),
    "https://www.ddn.com/events"
  );
  assert.equal(
    unwrapTrackedUrl("https://nam02.safelinks.protection.outlook.com/?url=https%3A%2F%2Fddn.com%2Fx&data=1"),
    "https://ddn.com/x"
  );
  assert.ok(isBookingUrl("https://www.ddn.com/lp/events/sc2026/book-a-meeting/"));
  assert.ok(isBookingUrl("https://example.com/some/path…"));
  assert.ok(!isBookingUrl("https://www.ddn.com/products/"));
});

test("an anchor to the booking page becomes {{BOOKING_LINK}}; other links stay", () => {
  const notes: string[] = [];
  const out = prepareForSending(
    '<p>See <a href="https://www.ddn.com/products/">products</a> or <a href="https://www.ddn.com/lp/events/sc2026/book-a-meeting/">book here</a>.</p>',
    notes
  );
  assert.equal(
    out,
    '<p>See <a href="https://www.ddn.com/products/">products</a> or {{BOOKING_LINK}}.</p>\n{{TRACKING_PIXEL}}'
  );
});

test("existing tracking placeholders are kept and not duplicated", () => {
  const html = "<p>Hi {{FIRST_NAME}}, {{BOOKING_LINK}}</p>{{TRACKING_PIXEL}}";
  assert.equal(prepareForSending(html), html);
});

test("a Subject: first line becomes the subject", () => {
  const r = plainTextToHtml("Subject: Re: SC26\n\nHi there");
  assert.equal(r.subject, "Re: SC26");
  assert.equal(r.html, "<p>Hi there</p>");
});

test("HTML documents keep their body and title", () => {
  const r = extractFromHtmlDocument("<html><head><title>Hello SC26</title></head><body><p>Hi</p><script>x()</script></body></html>");
  assert.equal(r.subject, "Hello SC26");
  assert.equal(r.html, "<p>Hi</p>");
  assert.ok(looksLikeHtml("<p>x</p>"));
  assert.ok(!looksLikeHtml("Hi [First Name], 3 < 4"));
});

test("Word document XML converts paragraphs, bold, lists and hyperlinks", () => {
  const doc = `<w:document><w:body>
    <w:p><w:r><w:t>Hi [First Name],</w:t></w:r></w:p>
    <w:p/>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Coffee.</w:t></w:r><w:r><w:t xml:space="preserve"> Short &amp; casual.</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Dinner.</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">Book </w:t></w:r><w:hyperlink r:id="rId5"><w:r><w:t>here</w:t></w:r></w:hyperlink></w:p>
  </w:body></w:document>`;
  const rels = `<Relationships><Relationship Id="rId5" Type="hyperlink" Target="https://www.ddn.com/lp/events/sc2026/book-a-meeting/" TargetMode="External"/></Relationships>`;
  const r = docxXmlToHtml(doc, rels);
  assert.equal(
    r.html,
    '<p>Hi [First Name],</p>\n\n<ul>\n  <li><strong>Coffee.</strong> Short &amp; casual.</li>\n  <li>Dinner.</li>\n</ul>\n\n<p>Book <a href="https://www.ddn.com/lp/events/sc2026/book-a-meeting/">here</a></p>'
  );
  assert.equal(prepareForSending(r.html).split("\n").pop(), "{{TRACKING_PIXEL}}");
  assert.match(prepareForSending(r.html), /<p>Book \{\{BOOKING_LINK\}\}<\/p>/);
});

test("a Word sign-off split across two paragraphs is kept together", () => {
  const doc = "<w:body><w:p><w:r><w:t>Thanks,</w:t></w:r></w:p><w:p><w:r><w:t>Marc and James</w:t></w:r></w:p></w:body>";
  assert.equal(docxXmlToHtml(doc).html, "<p>Thanks,<br>Marc and James</p>");
});
