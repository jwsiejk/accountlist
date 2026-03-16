import * as JSZip from "jszip";

import type { JobPosting, ResumeProfile, TailoredResumeVariant } from "./types";

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type ArtifactType = "resume" | "cover-letter";

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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const toParagraphXml = (line: string) => {
  if (!line) {
    return "<w:p/>";
  }

  return `<w:p><w:r><w:t xml:space=\"preserve\">${escapeXml(line)}</w:t></w:r></w:p>`;
};

const toDocxBytes = async (lines: string[]) => {
  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">',
    "<w:body>",
    ...lines.map(toParagraphXml),
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:docGrid w:linePitch="360"/></w:sectPr>',
    "</w:body>",
    "</w:document>",
  ].join("");

  const ZipCtor = JSZip as unknown as { new (): JSZip };
  const zip = new ZipCtor();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
      '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>' +
      '<Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
      "</Types>",
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      "</Relationships>",
  );
  zip.file(
    "docProps/core.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      "<dc:title>Job Hunter Export</dc:title>" +
      "<dc:creator>Partner Hub Job Hunter</dc:creator>" +
      "<cp:lastModifiedBy>Partner Hub Job Hunter</cp:lastModifiedBy>" +
      '<dcterms:created xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:created>' +
      '<dcterms:modified xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:modified>' +
      "</cp:coreProperties>",
  );
  zip.file(
    "docProps/app.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
      "<Application>Partner Hub Job Hunter</Application>" +
      "<DocSecurity>0</DocSecurity>" +
      "<ScaleCrop>false</ScaleCrop>" +
      "<Company></Company>" +
      "<LinksUpToDate>false</LinksUpToDate>" +
      "<SharedDoc>false</SharedDoc>" +
      "<HyperlinksChanged>false</HyperlinksChanged>" +
      "<AppVersion>1.0</AppVersion>" +
      "</Properties>",
  );
  zip.file("word/document.xml", documentXml);
  zip.file(
    "word/_rels/document.xml.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>' +
      '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
      "</Relationships>",
  );
  zip.file(
    "word/styles.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      "</w:styles>",
  );
  zip.file(
    "word/settings.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:zoom w:percent="100"/>' +
      '<w:defaultTabStop w:val="720"/>' +
      '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' +
      "</w:settings>",
  );
  zip.file(
    "word/fontTable.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:font w:name="Calibri"><w:panose1 w:val="020F0502020204030204"/><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font>' +
      "</w:fonts>",
  );
  zip.file(
    "word/theme/theme1.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">' +
      '<a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme></a:themeElements>' +
      "</a:theme>",
  );

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
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

export const generateTailoredResumeDocxArtifact = async (
  job: JobPosting,
  profile: ResumeProfile,
  variant: TailoredResumeVariant,
): Promise<DocExportArtifact> => {
  const fileName = buildAtsArtifactFileName(profile.fullName || "candidate", job.company, job.title, "resume");

  return {
    fileName,
    mimeType: DOCX_MIME_TYPE,
    bytes: await toDocxBytes(buildTailoredResumeDocLines(job, profile, variant)),
  };
};

export const generateCoverLetterDocxArtifact = async (
  job: JobPosting,
  profile: ResumeProfile,
  coverLetterMarkdown: string,
): Promise<DocExportArtifact> => {
  const fileName = buildAtsArtifactFileName(profile.fullName || "candidate", job.company, job.title, "cover-letter");

  return {
    fileName,
    mimeType: DOCX_MIME_TYPE,
    bytes: await toDocxBytes(buildCoverLetterDocLines(coverLetterMarkdown)),
  };
};
