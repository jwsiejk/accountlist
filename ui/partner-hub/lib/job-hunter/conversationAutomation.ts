import { deriveTopMatchesReviewQueue, rankJobsForReview } from "./discoveryAutomation";
import { buildConversationBriefForJob, buildInitialOutreachQueueForJob, normalizeCompanyKey } from "./conversations";
import type { ConversationBrief, ConversationTarget, JobHunterPreferences, JobHunterStore, JobPosting, OutreachSequence } from "./types";

export type ConversationAutomationSummary = {
  consideredJobs: number;
  eligibleJobs: number;
  generatedBriefs: number;
  generatedTargets: number;
  generatedOutreachDrafts: number;
  skippedDuplicates: number;
};

export type ConversationAssets = {
  briefsById: Record<string, ConversationBrief>;
  targetsById: Record<string, ConversationTarget>;
  sequencesById: Record<string, OutreachSequence>;
};

export const DEFAULT_CONVERSATION_MINIMUM_SCORE = 70;

const logicalOutreachKey = (sequence: OutreachSequence) => `${sequence.jobId}:${sequence.contactId}:${sequence.stage}:${sequence.channel}`;

const buildPlaceholderTargets = (job: JobPosting, now: Date): ConversationTarget[] => {
  const createdAt = now.toISOString();
  return [
    { id: `${job.id}:auto-recruiter`, company: job.company, name: `${job.company} Recruiter`, relationshipType: "recruiter", source: "manual", confidence: 60, createdAt, updatedAt: createdAt },
    { id: `${job.id}:auto-hiring-manager`, company: job.company, name: `${job.company} Hiring Manager`, relationshipType: "hiring_manager", source: "manual", confidence: 55, createdAt, updatedAt: createdAt },
  ];
};

export const shouldGenerateConversationForJob = (params: { jobId: string; rankedJobs: ReturnType<typeof rankJobsForReview>; minimumScore: number; topMatchesLimit: number }) => {
  const topMatches = deriveTopMatchesReviewQueue({ rankedJobs: params.rankedJobs, minimumScore: params.minimumScore, topMatchesLimit: params.topMatchesLimit });
  return topMatches.some((row) => row.job.id === params.jobId);
};

export const generateConversationAssetsForJobs = (params: {
  store: JobHunterStore;
  now: Date;
  minimumScore: number;
  topMatchesLimit: number;
  preferences?: JobHunterPreferences;
}): { assets: ConversationAssets; summary: ConversationAutomationSummary } => {
  const preferences = params.preferences ?? params.store.preferences;
  const rankedJobs = rankJobsForReview(params.store.jobs, preferences);
  const eligible = deriveTopMatchesReviewQueue({ rankedJobs, minimumScore: params.minimumScore, topMatchesLimit: params.topMatchesLimit });

  const briefsById: Record<string, ConversationBrief> = {};
  const targetsById: Record<string, ConversationTarget> = {};
  const sequencesById: Record<string, OutreachSequence> = {};

  let generatedBriefs = 0;
  let generatedTargets = 0;
  let generatedOutreachDrafts = 0;
  let skippedDuplicates = 0;

  for (const row of eligible) {
    const existingBrief = Object.values(params.store.conversationBriefsById).find((brief) => brief.jobId === row.job.id);
    const jobCompanyKey = normalizeCompanyKey(row.job.company);
    const companyTargets = Object.values(params.store.conversationTargetsById).filter((target) => normalizeCompanyKey(target.company) === jobCompanyKey);
    const existingOutreach = Object.values(params.store.outreachSequencesById).filter((sequence) => sequence.jobId === row.job.id);

    let brief = existingBrief;
    let targets = companyTargets;

    if (!brief) {
      const generated = buildConversationBriefForJob(row.job, undefined, params.store.resumeProfile, params.now);
      brief = generated.brief;
      briefsById[brief.id] = brief;
      generatedBriefs += 1;
    }

    if (targets.length === 0) {
      targets = buildPlaceholderTargets(row.job, params.now);
      for (const target of targets) {
        targetsById[target.id] = target;
        generatedTargets += 1;
      }
    }

    if (!brief) continue;

    const queue = buildInitialOutreachQueueForJob({ job: row.job, brief, targets, existing: existingOutreach, now: params.now });
    const seenLogicalKeys = new Set(existingOutreach.map(logicalOutreachKey));

    for (const draft of queue) {
      const key = logicalOutreachKey(draft);
      if (seenLogicalKeys.has(key)) {
        skippedDuplicates += 1;
        continue;
      }
      seenLogicalKeys.add(key);
      sequencesById[draft.id] = draft;
      generatedOutreachDrafts += 1;
    }
  }

  return {
    assets: { briefsById, targetsById, sequencesById },
    summary: {
      consideredJobs: rankedJobs.length,
      eligibleJobs: eligible.length,
      generatedBriefs,
      generatedTargets,
      generatedOutreachDrafts,
      skippedDuplicates,
    },
  };
};

export const mergeConversationAssetsIntoStore = (store: JobHunterStore, assets: ConversationAssets): JobHunterStore => {
  const nextBriefsById = { ...store.conversationBriefsById, ...assets.briefsById };
  const nextTargetsById = { ...store.conversationTargetsById, ...assets.targetsById };

  const nextSequencesById: Record<string, OutreachSequence> = { ...store.outreachSequencesById };
  const byLogicalKey = new Map<string, OutreachSequence>();
  for (const sequence of Object.values(nextSequencesById)) {
    byLogicalKey.set(logicalOutreachKey(sequence), sequence);
  }

  for (const sequence of Object.values(assets.sequencesById)) {
    const key = logicalOutreachKey(sequence);
    const existing = byLogicalKey.get(key);
    if (existing) {
      if (existing.status === "sent" || existing.status === "replied" || existing.status === "skipped" || existing.editedMessage) {
        continue;
      }
      continue;
    }
    nextSequencesById[sequence.id] = sequence;
    byLogicalKey.set(key, sequence);
  }

  return {
    ...store,
    conversationBriefsById: nextBriefsById,
    conversationBriefs: Object.values(nextBriefsById),
    conversationTargetsById: nextTargetsById,
    conversationTargets: Object.values(nextTargetsById),
    outreachSequencesById: nextSequencesById,
    outreachSequences: Object.values(nextSequencesById),
  };
};

export const generateConversationDraftsFromTopJobs = (params: {
  store: JobHunterStore;
  now: Date;
  minimumScore?: number;
  limit?: number;
  preferences?: JobHunterPreferences;
}): { store: JobHunterStore; summary: ConversationAutomationSummary } => {
  const minimumScore = Math.max(0, Math.min(100, params.minimumScore ?? params.store.preferences?.minimumScore ?? DEFAULT_CONVERSATION_MINIMUM_SCORE));
  const topMatchesLimit = Math.max(1, params.limit ?? params.store.automation?.topMatchesLimit ?? 10);

  const { assets, summary } = generateConversationAssetsForJobs({
    store: params.store,
    now: params.now,
    minimumScore,
    topMatchesLimit,
    preferences: params.preferences,
  });

  return { store: mergeConversationAssetsIntoStore(params.store, assets), summary };
};
