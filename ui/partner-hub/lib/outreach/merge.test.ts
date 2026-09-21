import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { escapeHtml, mergeTemplateText } from "./merge";

describe("mergeTemplateText", () => {
  const fields = {
    FIRST_NAME: "Jane",
    LAST_NAME: "Prospect",
    COMPANY: "Acme",
    SENDER_NAME: "DDN",
    TRACKING_PIXEL: '<img src="https://example.com/p" />',
    BOOKING_LINK: '<a href="https://example.com/c">book a meeting with DDN here</a>',
  };

  it("substitutes every known placeholder", () => {
    const source = "Hi {{FIRST_NAME}} {{LAST_NAME}} from {{COMPANY}}, --{{SENDER_NAME}}";
    assert.equal(mergeTemplateText(source, fields), "Hi Jane Prospect from Acme, --DDN");
  });

  it("substitutes tracking placeholders with raw markup, unescaped", () => {
    const source = "before {{TRACKING_PIXEL}} middle {{BOOKING_LINK}} after";
    assert.equal(
      mergeTemplateText(source, fields),
      'before <img src="https://example.com/p" /> middle <a href="https://example.com/c">book a meeting with DDN here</a> after'
    );
  });

  it("is tolerant of extra spacing inside the braces", () => {
    assert.equal(mergeTemplateText("Hi {{ FIRST_NAME }}", fields), "Hi Jane");
  });

  it("leaves an unknown placeholder untouched rather than dropping it", () => {
    assert.equal(mergeTemplateText("Hi {{NOT_A_FIELD}}", fields), "Hi {{NOT_A_FIELD}}");
  });

  it("leaves plain text with no placeholders unchanged", () => {
    assert.equal(mergeTemplateText("no placeholders here", fields), "no placeholders here");
  });

  it("substitutes every occurrence, not just the first", () => {
    assert.equal(mergeTemplateText("{{FIRST_NAME}} and {{FIRST_NAME}} again", fields), "Jane and Jane again");
  });
});

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    assert.equal(escapeHtml(`<b>Tom & "Jerry" 'n' friends</b>`), "&lt;b&gt;Tom &amp; &quot;Jerry&quot; &#39;n&#39; friends&lt;/b&gt;");
  });

  it("leaves ordinary text unchanged", () => {
    assert.equal(escapeHtml("Jane Prospect"), "Jane Prospect");
  });

  it("handles an empty string", () => {
    assert.equal(escapeHtml(""), "");
  });
});
