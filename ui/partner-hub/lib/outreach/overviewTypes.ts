import type { BatchSummary, Engagement, ProspectStatusName, SequenceState } from "./sequence";

/**
 * Shapes of the campaign read model (see overview.ts). Kept in their own
 * module, free of any database import, so pure code (the report CSV) and its
 * tests can use them without pulling in Prisma.
 */

export interface ContactRow {
  id: number;
  batchId: number | null;
  email: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  title: string | null;
  status: ProspectStatusName;
  sequence: SequenceState;
  engagement: Engagement;
  /** Most recent real (non-automated) open/click/reply, or null. */
  lastActivityAt: Date | null;
  createdAt: Date;
}

export interface BatchOverview {
  /** null = the "Unassigned" bucket (contacts not in any batch). */
  id: number | null;
  name: string;
  createdAt: Date | null;
  contacts: ContactRow[];
  summary: BatchSummary;
}

export interface CampaignOverview {
  campaign: { id: number; name: string; description: string | null; email2DelayDays: number; email3DelayDays: number };
  batches: BatchOverview[];
  summary: BatchSummary;
}
