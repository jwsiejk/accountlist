import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCleanPostingSummary, cleanInlineSourceText, cleanSourceText, decodeHtmlEntities } from "./textCleanup";

describe("textCleanup", () => {
  it("decodes named and numeric entities", () => {
    const value = decodeHtmlEntities("AT&amp;T &lt;test&gt; &quot;quoted&quot; &#39;x&#39; &#x26; &nbsp; done");
    assert.equal(value, 'AT&T <test> "quoted" \'x\' &   done');
  });

  it("strips html and collapses whitespace", () => {
    const cleaned = cleanSourceText("<div>Hello<br> <strong>world</strong></div><p> Next line </p>");
    assert.equal(cleaned, "Hello world Next line");
  });

  it("suppresses boilerplate and duplicate lines in summary", () => {
    const summary = buildCleanPostingSummary([
      "<p>Apply now</p><p>Build pipelines for customer onboarding.</p><p>Build pipelines for customer onboarding.</p>",
      "<p>Equal Opportunity Employer</p>",
      "<p>Back to jobs</p>",
    ]);

    assert.equal(summary, "Build pipelines for customer onboarding.");
  });

  it("truncates on clean boundaries", () => {
    const truncated = cleanInlineSourceText(
      "<p>Design customer onboarding workflows. Partner with sales teams to improve conversions. Build reports.</p>",
      70,
    );

    assert.equal(truncated, "Design customer onboarding workflows. Partner with sales teams to…");
  });
});
