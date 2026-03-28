"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("node:assert/strict");
const node_test_1 = require("node:test");
const JSZip = require("jszip");
const docExports_1 = require("./docExports");
const variant_1 = require("./resume/variant");
const profile = {
    fullName: "James Siejk",
    email: "james@example.com",
    phone: "555-0101",
    cityState: "Austin, TX",
    linkedinUrl: "https://linkedin.com/in/james",
    websiteUrl: "https://example.com",
    workAuthorizationNote: "Authorized to work in the US",
    signatureLine: "Sincerely,",
    headline: "Solutions Architect",
    summary: "Builds partner-facing technical solutions.",
    skills: ["Cloud architecture", "ATS optimization", "Sales engineering"],
    experience: [
        {
            company: "Acme",
            title: "Senior Architect",
            start: "2020",
            end: "Present",
            bullets: ["Led cloud migrations", "Built GTM playbooks", "Improved reporting quality"],
        },
    ],
    achievements: ["Increased adoption by 30%"],
};
const job = {
    id: "job-1",
    title: "Solutions Architect",
    company: "Acmé Systems",
    source: "company-site",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
};
(0, node_test_1.describe)("docExports", () => {
    (0, node_test_1.it)("normalizes deterministic ATS-safe filenames", () => {
        assert.equal((0, docExports_1.normalizeForFileName)("Münchën + Sons, Inc."), "munchen-sons-inc");
        assert.equal((0, docExports_1.buildAtsArtifactFileName)("James Siejk", "Acmé Systems", "Solutions Architect", "resume"), "james-siejk-acme-systems-solutions-architect-resume.docx");
    });
    (0, node_test_1.it)("builds tailored resume export lines from existing variant content", () => {
        const baseProfileBefore = JSON.stringify(profile);
        const variant = (0, variant_1.generateTailoredResumeVariant)(job, profile);
        const lines = (0, docExports_1.buildTailoredResumeDocLines)(job, profile, variant);
        assert.equal(JSON.stringify(profile), baseProfileBefore);
        assert.ok(lines.includes("James Siejk"));
        assert.ok(lines.includes("SUMMARY"));
        assert.ok(lines.includes(variant.tailoredSummary));
        assert.ok(lines.some((line) => line.includes("TAILORING DELTA")));
        assert.ok(lines.some((line) => line.includes("Base resume profile remains unchanged")));
        for (const skill of variant.prioritizedSkills) {
            assert.ok(lines.includes(`• ${skill}`));
        }
    });
    (0, node_test_1.it)("generates non-empty DOCX artifacts for resume and cover letter", async () => {
        const variant = (0, variant_1.generateTailoredResumeVariant)(job, profile);
        const coverLetter = [
            "Dear Hiring Team,",
            "",
            "I am excited to apply.",
            "",
            "Sincerely,",
            "James Siejk",
        ].join("\n");
        const resumeArtifact = await (0, docExports_1.generateTailoredResumeDocxArtifact)(job, profile, variant);
        const coverArtifact = await (0, docExports_1.generateCoverLetterDocxArtifact)(job, profile, coverLetter);
        assert.equal(resumeArtifact.fileName, "james-siejk-acme-systems-solutions-architect-resume.docx");
        assert.equal(coverArtifact.fileName, "james-siejk-acme-systems-solutions-architect-cover-letter.docx");
        assert.equal(resumeArtifact.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        assert.equal(coverArtifact.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        assert.ok(resumeArtifact.bytes.length > 1000);
        assert.ok(coverArtifact.bytes.length > 1000);
        assert.equal(String.fromCharCode(...resumeArtifact.bytes.slice(0, 2)), "PK");
        assert.equal(String.fromCharCode(...coverArtifact.bytes.slice(0, 2)), "PK");
        const resumeArchive = await JSZip.loadAsync(Buffer.from(resumeArtifact.bytes));
        assert.ok(Boolean(resumeArchive.file("[Content_Types].xml")));
        assert.ok(Boolean(resumeArchive.file("word/document.xml")));
        assert.ok(Boolean(resumeArchive.file("word/styles.xml")));
        assert.ok(Boolean(resumeArchive.file("docProps/core.xml")));
        const resumeDocumentXml = await resumeArchive.file("word/document.xml").async("text");
        assert.ok(resumeDocumentXml.includes("James Siejk"));
        assert.ok(resumeDocumentXml.includes("TAILORING DELTA (THIS JOB VARIANT ONLY)"));
        const coverArchive = await JSZip.loadAsync(Buffer.from(coverArtifact.bytes));
        assert.ok(Boolean(coverArchive.file("word/document.xml")));
        assert.ok(Boolean(coverArchive.file("_rels/.rels")));
        const coverDocumentXml = await coverArchive.file("word/document.xml").async("text");
        assert.ok(coverDocumentXml.includes("Dear Hiring Team,"));
        assert.ok(coverDocumentXml.includes("Sincerely,"));
    });
    (0, node_test_1.it)("preserves deterministic cover-letter line mapping", () => {
        const coverLetter = "Dear Hiring Team,\n\nLine two\nSincerely,\nJames";
        const lines = (0, docExports_1.buildCoverLetterDocLines)(coverLetter);
        assert.deepEqual(lines, ["Dear Hiring Team,", "", "Line two", "Sincerely,", "James"]);
    });
});
