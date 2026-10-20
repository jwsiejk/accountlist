/**
 * Click tracking for ordinary links in an email (not just {{BOOKING_LINK}}).
 *
 * At send time every http(s) link in the merged HTML is rewritten to this
 * app's click route for that recipient's token, carrying the real
 * destination plus a signature:
 *
 *   https://<app>/api/outreach/track/click/<token>?u=<destination>&s=<sig>
 *
 * The click route logs the click and redirects to `u` -- but only when `s`
 * is a valid HMAC of (token, u). Without the signature check the route
 * would be an open redirect anyone could use to bounce people to an
 * arbitrary site behind a DDN-looking URL. A missing or bad signature falls
 * back to the booking page, exactly as before this existed.
 *
 * Pure functions with the HMAC passed in, so they can be unit-tested without
 * env vars -- see linkTracking.test.ts. The send route and click route wire
 * in the real secret via lib/outreach/tokens.ts.
 */

export type Signer = (data: string) => string;

/** What gets signed for one tracked link: the recipient's token and the exact destination. */
export function linkSignaturePayload(token: string, url: string): string {
  return `link:${token}\n${url}`;
}

export function isTrackableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/** Tracked-click URL for one link in one recipient's email. */
export function trackedLinkUrl(clickBase: string, token: string, destination: string, sign: Signer): string {
  const s = sign(linkSignaturePayload(token, destination));
  return `${clickBase.replace(/\/+$/, "")}/${token}?u=${encodeURIComponent(destination)}&s=${encodeURIComponent(s)}`;
}

/** Constant-time string compare (both are short base64url strings). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The destination a click should redirect to, or null if the request
 * doesn't carry a valid signed one (the caller then uses the booking page).
 */
export function verifiedDestination(
  token: string,
  u: string | null,
  s: string | null,
  sign: Signer
): string | null {
  if (!u || !s || !isTrackableUrl(u)) return null;
  return safeEqual(sign(linkSignaturePayload(token, u)), s) ? u : null;
}

/** Minimal HTML-attribute entity decoding for href values (&amp; is the one that matters). */
function decodeAttr(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function encodeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export interface RewriteResult {
  html: string;
  /** Destinations that were rewritten, in order of appearance. */
  tracked: string[];
}

/**
 * Rewrites the href of every <a> tag whose href is an http(s) URL to a
 * tracked-click URL. Leaves alone: mailto:/tel:/#anchors, links that already
 * point at this app's click route (e.g. the {{BOOKING_LINK}} anchor), and
 * anything inside HTML comments.
 */
export function rewriteLinksForTracking(
  html: string,
  token: string,
  clickBase: string,
  sign: Signer
): RewriteResult {
  const tracked: string[] = [];
  const base = clickBase.replace(/\/+$/, "");
  // Split out comments so links mentioned inside them aren't touched.
  const parts = html.split(/(<!--[\s\S]*?-->)/g);
  const out = parts.map((part) => {
    if (part.startsWith("<!--")) return part;
    return part.replace(/<a\b([^>]*?)\bhref\s*=\s*(["'])(.*?)\2([^>]*)>/gi, (match, before, quote, rawHref, after) => {
      const href = decodeAttr(rawHref).trim();
      if (!isTrackableUrl(href)) return match;
      if (href.startsWith(base + "/")) return match; // already a tracked link
      tracked.push(href);
      const url = trackedLinkUrl(base, token, href, sign);
      return `<a${before}href=${quote}${encodeAttr(url)}${quote}${after}>`;
    });
  });
  return { html: out.join(""), tracked };
}

/** Short, human-readable label for a destination, e.g. "gartner.com/en/newsroom/…". */
export function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname === "/" ? "" : u.pathname;
    const full = host + path;
    return full.length > 48 ? full.slice(0, 47) + "…" : full;
  } catch {
    return url.length > 48 ? url.slice(0, 47) + "…" : url;
  }
}
