export const AI_INTERVIEW_DEBUG = process.env.NEXT_PUBLIC_AI_INTERVIEW_DEBUG === "true";

export function logDebug(event: string, data?: Record<string, unknown>): void {
  if (!AI_INTERVIEW_DEBUG) {
    return;
  }
  if (data) {
    console.log(`[ai-interview] ${event}`, data);
    return;
  }
  console.log(`[ai-interview] ${event}`);
}
