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
    "Start directly with: This is a [category] — [workload name] workload. It is used to [plain-English purpose].",
    "Use workload.category and workload.name for the opening; if isCustom is true, use category Custom and the custom workload name.",
    "Use workload.description as the base purpose statement, refined into plain English.",
    "Do not start with phrases like \"I'd like to summarize\", \"Here is a summary\", or \"In plain-English context\".",
    "After the opening, briefly explain why this workload matters to the business.",
    "Then explain what the customer is trying to accomplish using processImproved and successCriteria values when present.",
    "Then explain what the environment needs to support technically.",
    "If missingInputs contains fields, explain what information is missing and why it matters with concrete architecture/sizing impact.",
    "If missingInputs is empty, do not include a missing-information section.",
    "When missingInputs is empty, include this exact idea in natural prose: No required discovery inputs are currently flagged as missing.",
    "When missingInputs is empty, add a concise next-step cue toward deeper BOM/architecture detail (for example: For more detail, the next step should be a BOM Summary that maps these inputs to sizing and architecture considerations).",
    "Tie business intent to technical requirements with clear cause/effect statements (example: because the team needs faster fraud decisions, the platform needs near-real-time ingest and fast retrieval of case context).",
    "For missing fields, be specific about operational or architecture consequences, not generic risk language.",
    "Only explain why a field matters when that field appears in missingInputs.",
    "Avoid vague statements like \"this may impact business objectives\" unless you explain exactly what design decision is blocked.",
    "Do not use vendor pitch language.",
    "Do not sound like an interview answer.",
    "Use a helpful, plain-English tone for a sales counterpart.",
    "Keep jargon light; if jargon is needed, explain it simply.",
    "Do not invent facts beyond the provided fields.",
    "Use populated fields directly and specifically.",
    "Use populated latency, query concurrency, GPU, HA/DR, retention, and governance values directly when present.",
    "Avoid generic filler phrases like 'scalable environment' unless you explain what must scale and why.",
    "Only list a field as missing when it is truly blank, empty, unknown, TBD, or absent.",
    "If a field has a value in the structured context or known fields, treat it as known and use it.",
    "Do not claim category, governance, AI pattern, performance, or data details are missing when values are present.",
    "Do not speculate about hypothetical missing data that the tool has not flagged.",
    "If additional information beyond current fields would be useful, do not call it missing; instead position it as deeper BOM Summary or architecture review detail.",
    "Do not output lines like: 'The category seems to be Custom but is not clearly explained' unless custom was selected and the relevant custom fields are actually blank.",
    "Call out missing fields clearly when they are truly missing.",
    `Workload business framing hint: ${hint}`,
    "Use the workload business framing hint as context, but prioritize the actual field values provided by the user.",
    "When known fields include concrete numbers or targets, include them verbatim (for example data volume, refresh intervals, reduction targets, cycle-time goals, GPU tier details).",
    "If latency is listed in missingInputs, explain that it affects scoring/retrieval response targets, serving design, caching, data placement, and real-time vs near-real-time architecture.",
    "If query concurrency is listed in missingInputs, explain analyst/job concurrency impact on compute sizing, throughput, cache design, and peak user experience.",
    "If exact data volume is listed in missingInputs, explain impact on storage sizing, tiering, data protection, and high-performance active data placement.",
    "If daily ingest rate is listed in missingInputs, explain impact on ingestion pipeline throughput, indexing, embedding, and time-to-searchability.",
    "If GPU requirements are listed in missingInputs, explain impact on accelerator pool sizing across training, inference, embeddings, and analytics.",
    "If HA/DR requirements are listed in missingInputs, explain impact on replication, failover, and recovery objectives.",
    "Missing input count:",
    String(input.missingInputs.length),
    "When Missing input count is 0, do not include hypothetical missing-field examples.",
    "Respond in 3-5 short paragraphs.",
    "\nKnown fields (treat as populated facts):\n",
    knownFields.length > 0 ? knownFields.join("\n") : "None provided.",
    "\nMissing fields (only these are currently known gaps):\n",
    missingFields.length > 0 ? missingFields.join("\n") : "None currently flagged.",
    "\nStructured workload context:\n",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
