import { NextResponse } from "next/server";
import * as JSZip from "jszip";
import { simpleParser } from "mailparser";

import {
  docxXmlToHtml,
  extractFromHtmlDocument,
  plainTextToHtml,
  prepareForSending,
  type ImportResult,
} from "@/lib/outreach/templateImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A template is a short email; anything bigger than this is not one. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Converts an uploaded file into a template draft -- it does NOT save
 * anything. The Templates tab loads the result into the editor, where the
 * person reviews it (preview included) and saves it themselves.
 *
 * Accepts Word (.docx), a saved email (.eml, from Outlook or Gmail), HTML
 * (.html/.htm) and plain text (.txt/.md). Whatever the source, the body is
 * run through prepareForSending(): merge fields normalized to
 * {{FIRST_NAME}} etc., the booking link turned into the tracked
 * {{BOOKING_LINK}}, and {{TRACKING_PIXEL}} added. See templateImport.ts.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ ok: false, error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "That file is too large for an email template (5 MB max)." }, { status: 400 });
  }

  const name = file.name || "template";
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let base: ImportResult;
    if (ext === "docx") {
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file("word/document.xml")?.async("string");
      if (!documentXml) throw new Error("That doesn't look like a Word document (.docx).");
      const relsXml = (await zip.file("word/_rels/document.xml.rels")?.async("string")) ?? "";
      base = docxXmlToHtml(documentXml, relsXml);
    } else if (ext === "doc") {
      throw new Error("Old Word (.doc) files aren't supported. In Word, use File > Save As > Word Document (.docx), then import that.");
    } else if (ext === "eml") {
      const mail = await simpleParser(buffer);
      const fromHtml = typeof mail.html === "string" && mail.html.trim() ? extractFromHtmlDocument(mail.html) : null;
      base = fromHtml ?? plainTextToHtml(mail.text ?? "");
      if (mail.subject) base.subject = mail.subject;
      if (mail.attachments?.length) base.notes.push(`${mail.attachments.length} attachment(s) in the email were left out.`);
    } else if (ext === "html" || ext === "htm") {
      base = extractFromHtmlDocument(buffer.toString("utf8"));
    } else if (ext === "txt" || ext === "md" || ext === "text" || ext === "") {
      base = plainTextToHtml(buffer.toString("utf8"));
    } else {
      throw new Error(`Can't import .${ext} files. Use Word (.docx), a saved email (.eml), HTML or plain text.`);
    }

    const notes = [...base.notes];
    const html = prepareForSending(base.html, notes);
    if (!html.replace(/\{\{\s*TRACKING_PIXEL\s*\}\}/, "").trim()) {
      throw new Error("No email text was found in that file.");
    }

    return NextResponse.json(
      {
        ok: true,
        name: name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim(),
        subject: base.subject ?? null,
        html,
        notes,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Couldn't read that file." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
