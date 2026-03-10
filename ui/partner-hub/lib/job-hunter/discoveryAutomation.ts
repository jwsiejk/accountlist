import { jobMatchesPreferences } from "./preferences";
import { scoreJobFit, summarizeJobReason } from "./scoring";
import type { JobHunterAutomationSettings, JobHunterPreferences, JobPosting } from "./types";

export const DEFAULT_AUTOMATION_SETTINGS: JobHunterAutomationSettings = {
  autoSyncOnJobsOpen: true,
  autoSyncIfOlderThanHours: 24,
  topMatchesLimit: 10,
};

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
};

export const normalizeAutomationSettings = (
  input: Partial<JobHunterAutomationSettings> | undefined,
): JobHunterAutomationSettings => ({
  autoSyncOnJobsOpen:
    typeof input?.autoSyncOnJobsOpen === "boolean"
      ? input.autoSyncOnJobsOpen
      : DEFAULT_AUTOMATION_SETTINGS.autoSyncOnJobsOpen,
  autoSyncIfOlderThanHours: clampInt(
    input?.autoSyncIfOlderThanHours,
    DEFAULT_AUTOMATION_SETTINGS.autoSyncIfOlderThanHours,
    1,
    168,
  ),
  topMatchesLimit: clampInt(input?.topMatchesLimit, DEFAULT_AUTOMATION_SETTINGS.topMatchesLimit, 1, 50),
});

export const isSyncStale = (lastSyncedAt: string | undefined, staleAfterHours: number, nowMs = Date.now()) => {
  if (!lastSyncedAt) {
    return true;
  }

  const syncedAtMs = Date.parse(lastSyncedAt);
  if (!Number.isFinite(syncedAtMs)) {
    return true;
  }

  return nowMs - syncedAtMs >= staleAfterHours * 60 * 60 * 1000;
};

export const shouldAutoSyncOnJobsOpen = ({
  sourcesCount,
  lastSyncedAt,
  automation,
  nowMs,
}: {
  sourcesCount: number;
  lastSyncedAt?: string;
  automation: JobHunterAutomationSettings;
  nowMs?: number;
}) => {
  if (sourcesCount <= 0 || !automation.autoSyncOnJobsOpen) {
    return false;
  }

  return isSyncStale(lastSyncedAt, automation.autoSyncIfOlderThanHours, nowMs);
};

export type RankedJobRow = {
  job: JobPosting;
  score: number;
  excluded: boolean;
  exclusionReasons: string[];
  arrangement: ReturnType<typeof jobMatchesPreferences>["arrangement"];
  reasonSummary: string;
};

export const rankJobsForReview = (jobs: JobPosting[], preferences: JobHunterPreferences): RankedJobRow[] =>
  jobs
    .map((job) => {
      const fit = scoreJobFit(job, preferences);
      const exclusion = jobMatchesPreferences(job, preferences);

      return {
        job,
        score: fit.score,
        excluded: exclusion.excluded,
        exclusionReasons: exclusion.reasons,
        arrangement: exclusion.arrangement,
        reasonSummary: summarizeJobReason({
          excluded: exclusion.excluded,
          exclusionReasons: exclusion.reasons,
          preferenceSignals: fit.preferenceSignals,
        }),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.job.updatedAt.localeCompare(a.job.updatedAt);
    });

export const deriveTopMatchesReviewQueue = ({
  rankedJobs,
  topMatchesLimit,
  minimumScore,
}: {
  rankedJobs: RankedJobRow[];
  topMatchesLimit: number;
  minimumScore: number;
}) =>
  rankedJobs
    .filter((row) => !row.excluded && row.score >= Math.max(0, Math.min(100, minimumScore)))
    .slice(0, Math.max(1, topMatchesLimit));
