/**
 * A reusable outreach email template, stored as a file in this repo (see
 * ./index.ts for the registry) so new campaigns can be added by adding a
 * file here, without touching the send flow itself.
 *
 * `html` and `subject` are the *raw, unmerged* source -- they contain merge
 * placeholders (double-curly tokens) that get substituted per recipient at
 * send time (see ../merge.ts). This is deliberately plain string templating
 * rather than a component/JSX-based renderer: the dashboard needs to show
 * and let a person edit this exact source text before sending, and a
 * plain string round-trips through a <textarea> and back losslessly, where
 * a rendered React tree would not.
 */
export interface OutreachTemplate {
  /** Stable id, used in the dropdown and as the templateId sent to the API. */
  id: string;
  /** Display name in the template picker. */
  name: string;
  /** One-line description shown under the name in the picker. */
  description: string;
  subject: string;
  html: string;
}

/**
 * Merge placeholders every template may use. {{FIRST_NAME}}/{{LAST_NAME}}/
 * {{COMPANY}} come from the Prospect row; {{SENDER_NAME}} from
 * SC26_SENDER_NAME; {{TRACKING_PIXEL}} (the invisible open-tracking <img>)
 * and {{BOOKING_LINK}} (a complete `<a href="...">book a meeting...</a>`
 * anchor, tracked-click URL and link text both included) are supplied by
 * the send route itself (not user data) -- see merge.ts. A template does
 * not have to use all of these, but the two tracking ones should stay in
 * an edited template's HTML, or that send won't be tracked. Replacing
 * {{BOOKING_LINK}} with the whole anchor (rather than just the href) means
 * an edited template can move where the link appears but doesn't have to
 * separately manage its href and visible text.
 */
export const TEMPLATE_PLACEHOLDERS = [
  "FIRST_NAME",
  "LAST_NAME",
  "COMPANY",
  "SENDER_NAME",
  "TRACKING_PIXEL",
  "BOOKING_LINK",
] as const;
