import type { WorkloadSummaryRequest } from "./summarize-types";

const workloadBusinessHints: Record<string, string> = {
  fraud: "Focus on reducing fraud exposure, speeding investigations, and improving decision confidence.",
  risk: "Focus on understanding portfolio exposure, regulatory readiness, and scenario impact faster.",
  trading: "Focus on finding and validating trading strategies faster.",
  compliance: "Focus on reducing manual review effort and improving audit/regulatory response.",
  "fsi-rag": "Focus on helping employees find trusted answers faster.",
  "fsi-ft": "Focus on adapting models to domain language/processes and improving task quality under governance.",
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

  const knownFields = input.knownInputs
    .filter((item) => item.value && item.value.trim().length > 0)
    .map((item) => `${item.label}: ${item.value.trim()}`);

  const missingFields = input.missingInputs.map((item) => `${item.label}: ${item.whyItMatters.trim()}`);

  return [
    "You are a solutions engineer writing to a sales counterpart.",
    "Write a plain-English workload summary using only the provided data.",
    "Write natural paragraphs, not a rigid report format unless the user data is extremely sparse.",
    "Start with the business reason this workload exists.",
    "Then explain what the customer is trying to accomplish.",
    "Then explain what the environment needs to support technically.",
    "Then explain what information is missing and why it matters.",
    "Tie business intent to technical requirements with clear cause/effect statements (example: because the team needs faster fraud decisions, the platform needs near-real-time ingest and fast retrieval of case context).",
    "Do not use vendor pitch language.",
    "Do not sound like an interview answer.",
    "Use a helpful, plain-English tone for a sales counterpart.",
    "Keep jargon light; if jargon is needed, explain it simply.",
    "Do not invent facts beyond the provided fields.",
    "Use populated fields directly and specifically.",
    "Avoid generic filler phrases like 'scalable environment' unless you explain what must scale and why.",
    "Only list a field as missing when it is truly blank, empty, unknown, TBD, or absent.",
    "If a field has a value in the structured context or known fields, treat it as known and use it.",
    "Do not claim category, governance, AI pattern, performance, or data details are missing when values are present.",
    "Do not output lines like: 'The category seems to be Custom but is not clearly explained' unless custom was selected and the relevant custom fields are actually blank.",
    "Call out missing fields clearly when they are truly missing.",
    `Workload business framing hint: ${hint}`,
    "Use the workload business framing hint as context, but prioritize the actual field values provided by the user.",
    "Respond in 3-5 short paragraphs.",
    "\nKnown fields (treat as populated facts):\n",
    knownFields.length > 0 ? knownFields.join("\n") : "None provided.",
    "\nMissing fields (only these are currently known gaps):\n",
    missingFields.length > 0 ? missingFields.join("\n") : "None currently flagged.",
    "\nStructured workload context:\n",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
