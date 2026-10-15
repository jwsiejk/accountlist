/**
 * Turns an email someone already has -- typed or pasted as plain text,
 * exported as .html, saved from Outlook/Gmail as .eml, or written in Word
 * (.docx) -- into a template body this app can send: real HTML paragraphs
 * and lists, {{PLACEHOLDER}} merge fields, a tracked {{BOOKING_LINK}} and
 * the {{TRACKING_PIXEL}}.
 *
 * Pure string functions, no DOM or Node APIs, so the Templates tab (for
 * pasted text) and the import route (for files) share one implementation
 * and it can be unit-tested. See templateImport.test.ts.
 */

export interface ImportResult {
  /** Subject found in the source (an .eml header, an HTML <title>, or a "Subject:" line), if any. */
  subject?: string;
  html: string;
  /** Plain-English notes on what was changed, shown to the person after import. */
  notes: string[];
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** True if the text already looks like HTML markup rather than plain text. */
export function looksLikeHtml(s: string): boolean {
  return /<\s*(p|div|br|ul|ol|li|table|html|body|span|a|strong|b|em|h[1-6])\b[^>]*>/i.test(s);
}

// --- Placeholders -----------------------------------------------------------

const PLACEHOLDER_ALIASES: { pattern: RegExp; token: string }[] = [
  { pattern: /first[\s_-]*name/i, token: "FIRST_NAME" },
  { pattern: /last[\s_-]*name|surname/i, token: "LAST_NAME" },
  { pattern: /company(?:[\s_-]*name)?|organi[sz]ation|account/i, token: "COMPANY" },
  { pattern: /sender[\s_-]*name|your[\s_-]*name|my[\s_-]*name/i, token: "SENDER_NAME" },
];

/**
 * Rewrites the ways people usually write a merge field -- [First Name],
 * {First Name}, <<FirstName>>, {{first_name}}, %FIRST_NAME% -- into this
 * app's {{FIRST_NAME}} form. Anything unrecognised is left alone.
 */
export function normalizePlaceholders(source: string, notes: string[] = []): string {
  const found = new Set<string>();
  const out = source.replace(
    /\{\{\s*([^{}]{1,40}?)\s*\}\}|\[\s*([^\[\]]{1,40}?)\s*\]|\{\s*([^{}]{1,40}?)\s*\}|(?:&lt;&lt;|<<)\s*([^<>]{1,40}?)\s*(?:&gt;&gt;|>>)|%([A-Za-z_ ]{1,40}?)%/g,
    (match, ...groups: (string | undefined)[]) => {
      const inner = groups.slice(0, 5).find((g) => g !== undefined)?.trim() ?? "";
      const alias = PLACEHOLDER_ALIASES.find((a) => new RegExp(`^(?:${a.pattern.source})$`, "i").test(inner));
      if (!alias) return match;
      const replacement = `{{${alias.token}}}`;
      if (match !== replacement) found.add(`${match.replace(/&lt;/g, "<").replace(/&gt;/g, ">")} → ${replacement}`);
      return replacement;
    }
  );
  if (found.size > 0) notes.push(`Merge fields converted: ${Array.from(found).join(", ")}.`);
  return out;
}

// --- Links ------------------------------------------------------------------

/**
 * A link copied out of an email that was already sent is usually wrapped by
 * a click tracker (AWS SES "awstrack.me", Outlook Safe Links, Google
 * redirects). Returns the real destination, or the input if it isn't one.
 */
export function unwrapTrackedUrl(url: string): string {
  try {
    const awsMatch = url.match(/awstrack\.me\/L\d+\/([^/\s]+)/i);
    if (awsMatch) return decodeURIComponent(awsMatch[1]);
    const u = new URL(url);
    if (/safelinks\.protection\.outlook\.com$/i.test(u.hostname) && u.searchParams.get("url")) {
      return u.searchParams.get("url")!;
    }
    if (/(^|\.)google\.[a-z.]+$/i.test(u.hostname) && u.pathname === "/url" && (u.searchParams.get("q") || u.searchParams.get("url"))) {
      return (u.searchParams.get("q") || u.searchParams.get("url"))!;
    }
  } catch {
    // Not a parseable URL -- leave as is.
  }
  return url;
}

/** A URL that should become the tracked {{BOOKING_LINK}}: a copied tracking link, a cut-off link, or the booking page itself. */
export function isBookingUrl(url: string): boolean {
  const real = unwrapTrackedUrl(url);
  return (
    real !== url || // was wrapped by a click tracker: a copied link from a sent email
    /(…|\.\.\.)$/.test(url) || // truncated when copied
    /\/api\/outreach\/track\/click\//i.test(real) ||
    /book[-_ ]?a[-_ ]?meeting|\/book(ing)?\b|calendly\.com|outlook\.office\.com\/bookwithme/i.test(real)
  );
}

const URL_IN_TEXT = /\bhttps?:\/\/[^\s<>"')\]]+(?:…|\.\.\.)?/g;

// --- Plain text -> HTML -------------------------------------------------------

const BULLET = /^\s*(?:[*\-•·▪◦–]|\d{1,2}[.)])\s+/;

/**
 * Plain text (typed, pasted, or a .txt file) to email HTML: one <p> per
 * paragraph, bullet/numbered lines to lists, a short sign-off ("Thanks," /
 * "Marc") kept together with a line break, bare URLs to links.
 */
export function plainTextToHtml(text: string, notes: string[] = []): ImportResult {
  let lines = text.replace(/\r\n?/g, "\n").split("\n");
  let subject: string | undefined;
  const subjectLine = lines.findIndex((l) => l.trim() !== "");
  if (subjectLine >= 0 && /^\s*subject\s*:/i.test(lines[subjectLine])) {
    subject = lines[subjectLine].replace(/^\s*subject\s*:\s*/i, "").trim();
    lines = lines.slice(subjectLine + 1);
  }

  const blocks: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushList = () => {
    if (!list) return;
    const tag = list.ordered ? "ol" : "ul";
    blocks.push(`<${tag}>\n${list.items.map((i) => `  <li>${i}</li>`).join("\n")}\n</${tag}>`);
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (BULLET.test(line)) {
      const ordered = /^\s*\d/.test(line);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(inlineText(line.replace(BULLET, "")));
      continue;
    }
    flushList();
    // Sign-off: "Thanks," / "Best," followed by a short name line -> one paragraph with a line break.
    const next = lines[i + 1]?.trim();
    if (/^[A-Za-z' ]{2,25},$/.test(line) && next && next.length <= 40 && !BULLET.test(next)) {
      blocks.push(`<p>${inlineText(line)}<br>${inlineText(next)}</p>`);
      i++;
      continue;
    }
    // "Thanks, Marc and James" on one line -> split after the comma.
    const signoff = line.match(/^(thanks|thank you|best|regards|best regards|cheers|sincerely),\s+(.{2,40})$/i);
    if (signoff && i >= lines.length - 3) {
      blocks.push(`<p>${inlineText(signoff[1])},<br>${inlineText(signoff[2])}</p>`);
      continue;
    }
    blocks.push(`<p>${inlineText(line)}</p>`);
  }
  flushList();

  notes.push("Formatted plain text as email HTML (paragraphs and bullet lists).");
  return { subject, html: blocks.join("\n\n"), notes };
}

/** Escape one line of plain text and turn bare URLs into links (placeholders pass through). */
function inlineText(s: string): string {
  let out = "";
  let last = 0;
  for (const m of s.matchAll(URL_IN_TEXT)) {
    out += escapeHtml(s.slice(last, m.index));
    const url = m[0];
    out += `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;
    last = m.index! + url.length;
  }
  return out + escapeHtml(s.slice(last));
}

// --- HTML files ---------------------------------------------------------------

/** From a full HTML document, keep what's inside <body> and pull the <title> as a subject. */
export function extractFromHtmlDocument(html: string): ImportResult {
  const notes: string[] = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
  let body = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];
  const before = body;
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<o:p>\s*<\/o:p>/gi, "")
    .trim();
  if (body !== before.trim()) notes.push("Removed scripts and Office-only markup.");
  return { subject: title || undefined, html: body, notes };
}

// --- Word (.docx) ---------------------------------------------------------------

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/**
 * The body of a Word document (word/document.xml, plus its relationships
 * file for hyperlink targets) to email HTML: paragraphs, bold/italic runs,
 * hyperlinks and bulleted/numbered lists. Tables, images and styling are
 * left out -- a template is a short email, not a document.
 */
export function docxXmlToHtml(documentXml: string, relsXml = ""): ImportResult {
  const notes: string[] = [];
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) rels.set(m[1], decodeXml(m[2]));

  const body = documentXml.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? documentXml;
  if (/<w:tbl\b/.test(body)) notes.push("Tables in the Word file were left out.");
  if (/<w:drawing\b|<w:pict\b/.test(body)) notes.push("Images in the Word file were left out.");

  const blocks: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushList = () => {
    if (!list) return;
    const tag = list.ordered ? "ol" : "ul";
    blocks.push(`<${tag}>\n${list.items.map((i) => `  <li>${i}</li>`).join("\n")}\n</${tag}>`);
    list = null;
  };

  for (const pm of body.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, "").matchAll(/<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)) {
    const p = pm[1] ?? "";
    const inner = runsToHtml(p, rels);
    const isList = /<w:numPr>/.test(p);
    if (!inner.trim()) {
      flushList();
      continue;
    }
    if (isList) {
      // Bullet vs number lives in numbering.xml; bullets are the common case for an email, so lists import as bullets.
      const ordered = false;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(inner);
      continue;
    }
    flushList();
    blocks.push(`<p>${inner}</p>`);
  }
  flushList();
  // Keep a sign-off ("Thanks," then a short name paragraph) together, as in plain-text import.
  const html = blocks
    .join("\n\n")
    .replace(/<p>([A-Za-z' ]{2,25},)<\/p>\n\n<p>([^<]{1,40})<\/p>/g, "<p>$1<br>$2</p>");
  return { html, notes };
}

function runsToHtml(paragraphXml: string, rels: Map<string, string>): string {
  let out = "";
  // Walk hyperlinks and plain runs in document order.
  for (const m of paragraphXml.matchAll(/<w:hyperlink\b([^>]*)>([\s\S]*?)<\/w:hyperlink>|<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)) {
    if (m[2] !== undefined) {
      const id = m[1].match(/r:id="([^"]+)"/)?.[1];
      const href = id ? rels.get(id) : undefined;
      const text = Array.from(m[2].matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g))
        .map((r) => runText(r[1]))
        .join("");
      out += href ? `<a href="${escapeHtml(href)}">${text}</a>` : text;
    } else {
      out += runFormatted(m[3]);
    }
  }
  return out;
}

function runText(runXml: string): string {
  let s = "";
  for (const m of runXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g)) {
    if (m[1] !== undefined) s += escapeHtml(decodeXml(m[1]));
    else if (m[0] === "<w:br/>") s += "<br>";
    else s += " ";
  }
  return s;
}

function runFormatted(runXml: string): string {
  const text = runText(runXml);
  if (!text) return "";
  const props = runXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? "";
  const on = (tag: string) => new RegExp(`<w:${tag}(?:\\s+w:val="(?:true|1|on)")?\\s*/>`).test(props);
  let html = text;
  if (on("i")) html = `<em>${html}</em>`;
  if (on("b")) html = `<strong>${html}</strong>`;
  return html;
}

// --- Final pass: links, merge fields, tracking --------------------------------

/**
 * Makes an imported body ready to send from this app:
 * - merge fields in other formats become {{FIRST_NAME}} etc.;
 * - a booking link (a copied tracking link, a cut-off link, or the booking
 *   page itself) becomes {{BOOKING_LINK}}, so clicks are tracked per email;
 * - {{TRACKING_PIXEL}} is added at the end if missing, so opens are tracked.
 */
export function prepareForSending(html: string, notes: string[] = []): string {
  let out = normalizePlaceholders(html, notes);

  if (!/\{\{\s*BOOKING_LINK\s*\}\}/.test(out)) {
    let replaced = 0;
    // <a href="booking">text</a> -> {{BOOKING_LINK}}
    out = out.replace(/<a\b[^>]*\bhref="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi, (whole, href: string) => {
      if (replaced > 0 || !isBookingUrl(decodeXml(href))) return whole;
      replaced++;
      return "{{BOOKING_LINK}}";
    });
    // A bare booking URL left in the text.
    if (replaced === 0) {
      out = out.replace(URL_IN_TEXT, (url) => {
        if (replaced > 0 || !isBookingUrl(url)) return url;
        replaced++;
        return "{{BOOKING_LINK}}";
      });
    }
    if (replaced > 0) {
      notes.push(
        'Replaced the booking link with {{BOOKING_LINK}} so clicks are tracked. It shows as "book a meeting with DDN here" — check the sentence around it reads well.'
      );
    } else {
      notes.push("No booking link found. Add {{BOOKING_LINK}} where you want it, or clicks won't be tracked.");
    }
  }

  if (!/\{\{\s*TRACKING_PIXEL\s*\}\}/.test(out)) {
    out = `${out.trimEnd()}\n{{TRACKING_PIXEL}}`;
    notes.push("Added {{TRACKING_PIXEL}} at the end so opens are tracked.");
  }
  return out;
}

/**
 * Import pasted or typed content: plain text is formatted as HTML first,
 * HTML is kept; then prepareForSending() runs on either.
 */
export function importPastedContent(content: string): ImportResult {
  const notes: string[] = [];
  const base = looksLikeHtml(content) ? extractFromHtmlDocument(content) : plainTextToHtml(content);
  notes.push(...base.notes);
  return { subject: base.subject, html: prepareForSending(base.html, notes), notes };
}
