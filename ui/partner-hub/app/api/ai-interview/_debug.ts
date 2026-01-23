export const AI_INTERVIEW_DEBUG = process.env.AI_INTERVIEW_DEBUG === "true";

export function serverLog(event: string, data?: Record<string, unknown>): void {
  if (!AI_INTERVIEW_DEBUG) {
    return;
  }
  if (data) {
    console.info(`[ai-interview] ${event}`, data);
    return;
  }
  console.info(`[ai-interview] ${event}`);
}

export function getTurnId(req: Request): string | null {
  return req.headers.get("x-ai-interview-turn-id");
}

export function nowMs(): number {
  return Date.now();
}
