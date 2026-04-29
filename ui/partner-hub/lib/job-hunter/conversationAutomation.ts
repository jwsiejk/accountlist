import { buildConversationBriefForJob, buildInitialOutreachQueueForJob } from "./conversations";
import { scoreJobFit } from "./scoring";
import type { ConversationBrief, ConversationTarget, JobHunterPreferences, JobHunterStore, OutreachSequence } from "./types";

export type ConversationAutomationSummary = {
  consideredJobs: number;
  eligibleJobs: number;
  generatedBriefs: number;
  generatedTargets: number;
  generatedOutreachDrafts: number;
};

export const DEFAULT_CONVERSATION_MINIMUM_SCORE = 70;

export const generateConversationDraftsFromTopJobs = (params: {
  store: JobHunterStore;
  now: Date;
  minimumScore?: number;
  limit?: number;
  preferences?: JobHunterPreferences;
}): { store: JobHunterStore; summary: ConversationAutomationSummary } => {
  const minimumScore = Math.max(0, Math.min(100, params.minimumScore ?? params.store.preferences?.minimumScore ?? DEFAULT_CONVERSATION_MINIMUM_SCORE));
  const limit = Math.max(1, params.limit ?? params.store.automation?.topMatchesLimit ?? 10);
  const preferences = params.preferences ?? params.store.preferences;

  const ranked = [...params.store.jobs]
    .map((job) => ({ job, fit: scoreJobFit(job, preferences) }))
    .sort((a, b) => (b.fit.score !== a.fit.score ? b.fit.score - a.fit.score : b.job.updatedAt.localeCompare(a.job.updatedAt)));

  const eligible = ranked.filter((row) => row.fit.score >= minimumScore).slice(0, limit);

  const nextBriefsById: Record<string, ConversationBrief> = { ...params.store.conversationBriefsById };
  const nextTargetsById: Record<string, ConversationTarget> = { ...params.store.conversationTargetsById };
  const nextSequencesById: Record<string, OutreachSequence> = { ...params.store.outreachSequencesById };

  let generatedBriefs = 0;
  let generatedTargets = 0;
  let generatedOutreachDrafts = 0;

  for (const row of eligible) {
    const existingBrief = Object.values(nextBriefsById).find((brief) => brief.jobId === row.job.id);
    const companyTargets = Object.values(nextTargetsById).filter((target) => target.company === row.job.company);
    const existingOutreach = Object.values(nextSequencesById).filter((sequence) => sequence.jobId === row.job.id);

    let brief = existingBrief;
    let targets = companyTargets;

    if (!brief) {
      const generated = buildConversationBriefForJob(row.job, {
        matched: row.fit.matched.map((item) => item.keyword),
        missing: row.fit.missing.map((item) => item.keyword),
        preferenceSignals: row.fit.preferenceSignals,
      }, params.store.resumeProfile, params.now);
      brief = generated.brief;
      targets = generated.targets;
      nextBriefsById[brief.id] = brief;
      generatedBriefs += 1;

      for (const target of targets) {
        if (!nextTargetsById[target.id]) {
          nextTargetsById[target.id] = target;
          generatedTargets += 1;
        }
      }
    }

    if (!brief) continue;

    const queue = buildInitialOutreachQueueForJob({
      job: row.job,
      brief,
      targets,
      existing: existingOutreach,
      now: params.now,
    });

    for (const draft of queue) {
      if (!nextSequencesById[draft.id]) {
        nextSequencesById[draft.id] = draft;
        generatedOutreachDrafts += 1;
      }
    }
  }

  return {
    store: {
      ...params.store,
      conversationBriefsById: nextBriefsById,
      conversationBriefs: Object.values(nextBriefsById),
      conversationTargetsById: nextTargetsById,
      conversationTargets: Object.values(nextTargetsById),
      outreachSequencesById: nextSequencesById,
      outreachSequences: Object.values(nextSequencesById),
    },
    summary: {
      consideredJobs: ranked.length,
      eligibleJobs: eligible.length,
      generatedBriefs,
      generatedTargets,
      generatedOutreachDrafts,
    },
  };
};
