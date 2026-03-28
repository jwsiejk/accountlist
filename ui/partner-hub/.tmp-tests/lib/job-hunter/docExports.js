"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCoverLetterDocxArtifact = exports.generateTailoredResumeDocxArtifact = exports.buildCoverLetterDocLines = exports.buildTailoredResumeDocLines = exports.buildAtsArtifactFileName = exports.normalizeForFileName = void 0;
const JSZip = require("jszip");
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
// Base DOCX package generated from a standards-compliant blank document template.
// We only replace word/document.xml content at export time.
const DOCX_TEMPLATE_BASE64 = "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";
const normalizeForFileName = (value) => {
    const normalized = value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
    return normalized || "untitled";
};
exports.normalizeForFileName = normalizeForFileName;
const buildAtsArtifactFileName = (candidateName, company, role, artifactType, extension = "docx") => {
    return [candidateName, company, role, artifactType].map(exports.normalizeForFileName).join("-") + `.${extension}`;
};
exports.buildAtsArtifactFileName = buildAtsArtifactFileName;
const escapeXml = (value) => {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
};
const toParagraphXml = (line) => {
    if (!line) {
        return "<w:p/>";
    }
    return `<w:p><w:r><w:t xml:space=\"preserve\">${escapeXml(line)}</w:t></w:r></w:p>`;
};
const toDocxBytes = async (lines) => {
    const documentXml = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">',
        "<w:body>",
        ...lines.map(toParagraphXml),
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:docGrid w:linePitch="360"/></w:sectPr>',
        "</w:body>",
        "</w:document>",
    ].join("");
    const zip = await JSZip.loadAsync(DOCX_TEMPLATE_BASE64, { base64: true });
    zip.file("word/document.xml", documentXml);
    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
};
const buildTailoredResumeDocLines = (job, profile, variant) => {
    const lines = [
        profile.fullName,
        [profile.email, profile.phone, profile.cityState].filter(Boolean).join(" | "),
    ];
    if (profile.linkedinUrl) {
        lines.push(profile.linkedinUrl);
    }
    if (profile.websiteUrl) {
        lines.push(profile.websiteUrl);
    }
    lines.push("", variant.tailoredHeadline, "", "SUMMARY", variant.tailoredSummary, "", "SKILLS");
    lines.push(...(variant.prioritizedSkills.length > 0 ? variant.prioritizedSkills.map((skill) => `• ${skill}`) : ["• (none)"]));
    lines.push("", "EXPERIENCE");
    for (const entry of variant.experience) {
        const dates = [entry.start, entry.end].filter(Boolean).join(" - ");
        lines.push(`${entry.title} | ${entry.company}${dates ? ` | ${dates}` : ""}`);
        for (const bullet of entry.selectedBullets) {
            lines.push(`• ${bullet}`);
        }
        lines.push("");
    }
    lines.push("TAILORING DELTA (THIS JOB VARIANT ONLY)");
    lines.push(...variant.deltaSummary.map((line) => `• ${line}`));
    lines.push("Base resume profile remains unchanged and is the source of truth.");
    lines.push(`Target role: ${job.title} at ${job.company}`);
    return lines;
};
exports.buildTailoredResumeDocLines = buildTailoredResumeDocLines;
const buildCoverLetterDocLines = (coverLetterMarkdown) => {
    return coverLetterMarkdown.split("\n").map((line) => line.trimEnd());
};
exports.buildCoverLetterDocLines = buildCoverLetterDocLines;
const generateTailoredResumeDocxArtifact = async (job, profile, variant) => {
    const fileName = (0, exports.buildAtsArtifactFileName)(profile.fullName || "candidate", job.company, job.title, "resume");
    return {
        fileName,
        mimeType: DOCX_MIME_TYPE,
        bytes: await toDocxBytes((0, exports.buildTailoredResumeDocLines)(job, profile, variant)),
    };
};
exports.generateTailoredResumeDocxArtifact = generateTailoredResumeDocxArtifact;
const generateCoverLetterDocxArtifact = async (job, profile, coverLetterMarkdown) => {
    const fileName = (0, exports.buildAtsArtifactFileName)(profile.fullName || "candidate", job.company, job.title, "cover-letter");
    return {
        fileName,
        mimeType: DOCX_MIME_TYPE,
        bytes: await toDocxBytes((0, exports.buildCoverLetterDocLines)(coverLetterMarkdown)),
    };
};
exports.generateCoverLetterDocxArtifact = generateCoverLetterDocxArtifact;
