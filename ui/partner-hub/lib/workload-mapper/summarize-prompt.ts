import type { WorkloadSummaryRequest } from "./summarize-types";

const workloadBusinessHints: Record<string, string> = {
  fraud: "Focus on reducing fraud exposure, speeding investigations, and improving decision confidence.",
  "risk-modeling": "Focus on understanding portfolio exposure, regulatory readiness, and scenario impact faster.",
  trading: "Focus on finding and validating trading strategies faster.",
  compliance: "Focus on reducing manual review effort and improving audit/regulatory response.",
  rag: "Focus on helping employees find trusted answers faster.",
  "model-finetune": "Focus on adapting models to domain language/processes and improving task quality under governance.",
  "ai-training": "Focus on building differentiated AI capabilities or domain models.",
  inference: "Focus on serving AI capabilities reliably to users/apps with predictable latency.",
  simulation: "Focus on completing simulations faster and shortening time from run to insight.",
  genomics: "Focus on improving sample/pipeline turnaround while preserving traceability.",
  media: "Focus on delivering creative/rendering work faster under deadline pressure.",
};

export function buildSummarizePrompt(input: WorkloadSummaryRequest): string {
  const hint = input.workload.isCustom
    ? "Infer business context from custom workload name, description, process improved, and success criteria."
    : workloadBusinessHints[input.workload.id] ?? "Use the workload details to infer the likely business driver.";

  return [
    "You are a solutions engineer writing to a sales counterpart.",
    "Write a plain-English workload summary using only the provided data.",
    "Start with the business reason this workload exists.",
    "Then explain what the customer is trying to accomplish.",
    "Then explain what the environment needs to support technically.",
    "Then explain what information is missing and why it matters.",
    "Do not use vendor pitch language.",
    "Do not sound like an interview answer.",
    "Keep jargon light; if jargon is needed, explain it simply.",
    "Do not invent facts beyond the provided fields.",
    "Call out missing fields clearly.",
    `Workload business framing hint: ${hint}`,
    "Respond in 3-5 short paragraphs.",
    "\nStructured workload context:\n",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
