import type { WorkloadSummaryRequest } from "./summarize-types";

export function buildSummarizePrompt(input: WorkloadSummaryRequest): string {
  return [
    "You are generating a plain-English workload summary for a sales counterpart.",
    "Use only the provided structured input.",
    "Do not quote field names or source labels.",
    "Do not use phrases like 'as stated by', 'which translates to', or 'I'd like to summarize'.",
    "Start the first sentence exactly in this style: This is an [category] — [workload name] workload...",
    "In the opening paragraph, explain the business reason and customer goal in natural language.",
    "Then explain the key technical needs implied by the captured inputs in natural language.",
    "Only discuss missing discovery items from missingInputs.",
    "If missingInputs is empty, explicitly state: no required discovery inputs are currently flagged as missing.",
    "If missingInputs is empty, also direct the user to the BOM Summary for deeper architecture mapping detail.",
    "Do not focus on DDN reference patterns, BOM mapping, SKUs, pricing, node counts, GPU counts, or final sizing.",
    "Structured context:",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
