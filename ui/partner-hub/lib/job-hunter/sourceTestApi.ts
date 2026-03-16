import type { JobSourceSyncDiagnostic } from "./types";

export type SourceTestApiPayload = {
  success: boolean;
  result?: JobSourceSyncDiagnostic;
  error?: string;
};

export const getSourceTestStatus = (payload: SourceTestApiPayload): number => {
  if (!payload.result) {
    return 400;
  }

  return payload.success && payload.result.success ? 200 : 422;
};
