"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const textCleanup_1 = require("./textCleanup");
(0, node_test_1.describe)("textCleanup", () => {
    (0, node_test_1.it)("decodes named and numeric entities", () => {
        const value = (0, textCleanup_1.decodeHtmlEntities)("AT&amp;T &lt;test&gt; &quot;quoted&quot; &#39;x&#39; &#x26; &nbsp; done");
        assert.equal(value, 'AT&T <test> "quoted" \'x\' &   done');
    });
    (0, node_test_1.it)("strips html and collapses whitespace", () => {
        const cleaned = (0, textCleanup_1.cleanSourceText)("<div>Hello<br> <strong>world</strong></div><p> Next line </p>");
        assert.equal(cleaned, "Hello world Next line");
    });
    (0, node_test_1.it)("suppresses boilerplate and duplicate lines in summary", () => {
        const summary = (0, textCleanup_1.buildCleanPostingSummary)([
            "<p>Apply now</p><p>Build pipelines for customer onboarding.</p><p>Build pipelines for customer onboarding.</p>",
            "<p>Equal Opportunity Employer</p>",
            "<p>Back to jobs</p>",
        ]);
        assert.equal(summary, "Build pipelines for customer onboarding.");
    });
    (0, node_test_1.it)("truncates on clean boundaries", () => {
        const truncated = (0, textCleanup_1.cleanInlineSourceText)("<p>Design customer onboarding workflows. Partner with sales teams to improve conversions. Build reports.</p>", 70);
        assert.equal(truncated, "Design customer onboarding workflows. Partner with sales teams to…");
    });
});
