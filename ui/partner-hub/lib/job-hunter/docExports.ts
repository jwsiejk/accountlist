import type { JobPosting, ResumeProfile, TailoredResumeVariant } from "./types";

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type ArtifactType = "resume" | "cover-letter";

type ZipEntry = {
  path: string;
  data: Uint8Array;
};

export type DocExportArtifact = {
  fileName: string;
  mimeType: typeof DOCX_MIME_TYPE;
  bytes: Uint8Array;
};

export const normalizeForFileName = (value: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || "untitled";
};

export const buildAtsArtifactFileName = (
  candidateName: string,
  company: string,
  role: string,
  artifactType: ArtifactType,
  extension = "docx",
) => {
  return [candidateName, company, role, artifactType].map(normalizeForFileName).join("-") + `.${extension}`;
};

const escapeXml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const toParagraphXml = (line: string) => {
  if (!line) {
    return "<w:p/>";
  }
  return `<w:p><w:r><w:t xml:space=\"preserve\">${escapeXml(line)}</w:t></w:r></w:p>`;
};

const textEncoder = new TextEncoder();
const u32 = (value: number) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
const u16 = (value: number) => [value & 255, (value >>> 8) & 255];

const crcTable = new Uint32Array(256).map((_, index) => {
  let current = index;
  for (let bit = 0; bit < 8; bit += 1) {
    current = (current & 1) !== 0 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  }
  return current >>> 0;
});

const crc32 = (buffer: Uint8Array) => {
  let current = 0xffffffff;
  for (const byte of buffer) {
    current = crcTable[(current ^ byte) & 0xff] ^ (current >>> 8);
  }
  return (current ^ 0xffffffff) >>> 0;
};

const createStoredZip = (entries: ZipEntry[]) => {
  const chunks: number[] = [];
  const centralDirectory: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    const pathBytes = textEncoder.encode(entry.path);
    const data = entry.data;
    const checksum = crc32(data);

    const localHeader = [
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(checksum),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(pathBytes.length),
      ...u16(0),
      ...Array.from(pathBytes),
    ];

    chunks.push(...localHeader, ...Array.from(data));

    const centralHeader = [
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(checksum),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(pathBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...Array.from(pathBytes),
    ];

    centralDirectory.push(...centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralStart = chunks.length;
  chunks.push(...centralDirectory);

  const endRecord = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralDirectory.length),
    ...u32(centralStart),
    ...u16(0),
  ];

  chunks.push(...endRecord);
  return Uint8Array.from(chunks);
};

const toDocxBytes = (paragraphs: string[]) => {
  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    '<w:body>',
    ...paragraphs.map(toParagraphXml),
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>',
    '</w:body>',
    '</w:document>',
  ].join("");

  const entries: ZipEntry[] = [
    {
      path: "[Content_Types].xml",
      data: textEncoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          "</Types>",
      ),
    },
    {
      path: "_rels/.rels",
      data: textEncoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          "</Relationships>",
      ),
    },
    {
      path: "word/document.xml",
      data: textEncoder.encode(documentXml),
    },
  ];

  return createStoredZip(entries);
};

export const buildTailoredResumeDocLines = (job: JobPosting, profile: ResumeProfile, variant: TailoredResumeVariant) => {
  const lines: string[] = [
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

export const buildCoverLetterDocLines = (coverLetterMarkdown: string) => {
  return coverLetterMarkdown.split("\n").map((line) => line.trimEnd());
};

export const generateTailoredResumeDocxArtifact = (
  job: JobPosting,
  profile: ResumeProfile,
  variant: TailoredResumeVariant,
): DocExportArtifact => {
  const fileName = buildAtsArtifactFileName(profile.fullName || "candidate", job.company, job.title, "resume");

  return {
    fileName,
    mimeType: DOCX_MIME_TYPE,
    bytes: toDocxBytes(buildTailoredResumeDocLines(job, profile, variant)),
  };
};

export const generateCoverLetterDocxArtifact = (
  job: JobPosting,
  profile: ResumeProfile,
  coverLetterMarkdown: string,
): DocExportArtifact => {
  const fileName = buildAtsArtifactFileName(profile.fullName || "candidate", job.company, job.title, "cover-letter");

  return {
    fileName,
    mimeType: DOCX_MIME_TYPE,
    bytes: toDocxBytes(buildCoverLetterDocLines(coverLetterMarkdown)),
  };
};
