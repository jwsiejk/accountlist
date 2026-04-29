import type { ConversationTarget, ConversationTargetRelationship, ConversationTargetSource, JobPosting } from "./types";

export const RELATIONSHIP_OPTIONS: ConversationTargetRelationship[] = ["recruiter", "hiring_manager", "employee", "referral", "unknown"];
export const SOURCE_OPTIONS: ConversationTargetSource[] = ["manual", "linkedin", "company_site", "imported", "other"];

export type TargetDraft = {
  name: string;
  title: string;
  relationshipType: ConversationTargetRelationship;
  profileUrl: string;
  email: string;
  source: ConversationTargetSource;
  notes: string;
};

export const createTargetDraft = (): TargetDraft => ({
  name: "",
  title: "",
  relationshipType: "unknown",
  profileUrl: "",
  email: "",
  source: "manual",
  notes: "",
});

export const isTargetDraftValid = (job: JobPosting | undefined, draft: TargetDraft): job is JobPosting => {
  return Boolean(job && draft.name.trim());
};

export const buildConversationTarget = ({ jobId, job, draft, nowIso }: { jobId: string; job: JobPosting; draft: TargetDraft; nowIso: string }): ConversationTarget => ({
  id: `${jobId}:manual:${draft.name.trim().toLowerCase().replace(/\W+/g, "-")}`,
  company: job.company,
  name: draft.name.trim(),
  title: draft.title.trim() || undefined,
  relationshipType: draft.relationshipType,
  profileUrl: draft.profileUrl.trim() || undefined,
  email: draft.email.trim() || undefined,
  source: draft.source,
  confidence: 50,
  notes: draft.notes.trim() || undefined,
  createdAt: nowIso,
  updatedAt: nowIso,
});
