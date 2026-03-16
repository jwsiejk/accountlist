import type { JobSourceConfig, JobSourceSyncDiagnostic } from "./types";
import { fetchJobsForSource } from "./syncEngine";

export const testJobSource = async (source: JobSourceConfig): Promise<JobSourceSyncDiagnostic> => {
  try {
    const jobs = await fetchJobsForSource(source);
    return {
      sourceId: `${source.boardType}:${source.boardToken}`,
      company: source.company,
      provider: source.boardType,
      token: source.boardToken,
      success: true,
      jobsFetched: jobs.length,
    };
  } catch (error) {
    return {
      sourceId: `${source.boardType}:${source.boardToken}`,
      company: source.company,
      provider: source.boardType,
      token: source.boardToken,
      success: false,
      jobsFetched: 0,
      error: error instanceof Error ? error.message : "Unknown source test error",
    };
  }
};
