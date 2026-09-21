/**
 * Substitutes {{PLACEHOLDER}} tokens in a template's (possibly
 * user-edited) subject/html into the final, per-recipient content that
 * actually gets sent. See templates/types.ts for the placeholder list.
 *
 * Deliberately a single flat string-replace pass, not a templating engine
 * (no conditionals/loops) -- these are short marketing emails edited by
 * hand in a <textarea>, and the failure mode of a fancier engine (a syntax
 * error in someone's edit silently breaking the send) is worse than the
 * limitation of "no logic, just substitution".
 */

export interface MergeFields {
  FIRST_NAME: string;
  LAST_NAME: string;
  COMPANY: string;
  SENDER_NAME: string;
  /** Full <img> tag for open tracking -- see urls.ts's trackingPixelUrl(). */
  TRACKING_PIXEL: string;
  /** Full <a href="...">...</a> anchor for click tracking -- see urls.ts's trackingClickUrl(). */
  BOOKING_LINK: string;
}

/**
 * Merge placeholders every template may use. FIRST_NAME/LAST_NAME/COMPANY
 * come from the Prospect row; SENDER_NAME from SC26_SENDER_NAME;
 * TRACKING_PIXEL (the invisible open-tracking <img>) and BOOKING_LINK (a
 * complete `<a href="...">book a meeting...</a>` anchor, tracked-click URL
 * and link text both included) are supplied by the send route itself (not
 * user data). A template does not have to use all of these, but the two
 * tracking ones should stay in an edited template's HTML, or that send
 * won't be tracked. Replacing BOOKING_LINK with the whole anchor (rather
 * than just the href) means an edited template can move where the link
 * appears but doesn't have to separately manage its href and visible text.
 */
export const TEMPLATE_PLACEHOLDERS = [
  "FIRST_NAME",
  "LAST_NAME",
  "COMPANY",
  "SENDER_NAME",
  "TRACKING_PIXEL",
  "BOOKING_LINK",
] as const;

const PLACEHOLDER_PATTERN = /\{\{\s*([A-Z_]+)\s*\}\}/g;

export function mergeTemplateText(source: string, fields: MergeFields): string {
  return source.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    return key in fields ? fields[key as keyof MergeFields] : match;
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
