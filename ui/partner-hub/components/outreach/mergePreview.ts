/**
 * Client-side preview merge only -- cosmetic, so a person editing a
 * template or reviewing a send can see roughly what the email will look
 * like. The real, authoritative merge (real tracking URLs, HTML-escaped
 * fields, the plain-text-safe subject variant) happens server-side per
 * recipient in api/outreach/send/route.ts -- see lib/outreach/merge.ts.
 */

export interface PreviewFields {
  firstName?: string;
  lastName?: string | null;
  company?: string | null;
}

export function previewMerge(source: string, prospect?: PreviewFields): string {
  const fields: Record<string, string> = {
    FIRST_NAME: prospect?.firstName || "Jordan",
    LAST_NAME: prospect?.lastName || "Prospect",
    COMPANY: prospect?.company || "Example Corp",
    // Cosmetic only -- the real SENDER_NAME merge value comes from the
    // server-side SC26_SENDER_NAME env var at send time, which isn't
    // exposed to the client.
    SENDER_NAME: "DDN",
    TRACKING_PIXEL: "",
    BOOKING_LINK: '<a href="#">book a meeting with DDN here</a>',
  };
  return source.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (match, key: string) =>
    key in fields ? fields[key] : match
  );
}

// Kept as a plain string rather than inline in JSX -- literal double curly
// braces in JSX text get parsed as an expression, so this would otherwise
// need an awkward {"{{FIRST_NAME}}"} escape at every occurrence.
export const PLACEHOLDER_HINT =
  "Placeholders: {{FIRST_NAME}}, {{LAST_NAME}}, {{COMPANY}}, {{SENDER_NAME}}, {{TRACKING_PIXEL}}, {{BOOKING_LINK}}. " +
  "Keep {{TRACKING_PIXEL}} and {{BOOKING_LINK}} somewhere in the HTML, or opens/clicks for this send won't be tracked.";
