import { sc26Invite } from "./sc26-invite";
import type { OutreachTemplate } from "./types";

export type { OutreachTemplate };
export { TEMPLATE_PLACEHOLDERS } from "./types";

/**
 * The template library. Add a new campaign by adding a file next to
 * sc26-invite.ts and listing it here -- the dashboard's template picker
 * and GET /api/sc26-outreach/templates both read from this array, nothing
 * else to wire up.
 */
export const TEMPLATES: OutreachTemplate[] = [sc26Invite];

export function getTemplate(id: string): OutreachTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
