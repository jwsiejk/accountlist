import type { WorkloadSummaryRequest } from "./summarize-types";

export function buildSummarizePrompt(input: WorkloadSummaryRequest): string {
  return [
    "You are generating a BOM Summary narrative for an AI workload discovery workflow.",
    "This output is not a BOM and must not include SKUs, pricing, node counts, GPU counts, or final sizing.",
    "Use only the provided structured input.",
    "Output in plain English with concise sections in this order:",
    "1) Opening disclaimer (use this exact sentence): This is not a final BOM. It is a DDN-informed architecture mapping based on the current workload inputs.",
    "2) Closest pattern (start with: Based on the captured inputs, this workload most closely aligns to ...)",
    "3) Building blocks (for each provided building block, explain what it does, why it fits, and which captured inputs point to it)",
    "4) Validation before BOM (use the provided validationBeforeBom list and relate to current inputs)",
    "5) Closing note (state this is an example starting point based on DDN public reference architecture/platform themes; final sizing and BOM require DDN/customer validation, benchmark expectations, and constraints)",
    "Use safer wording such as: The captured inputs point toward..., This resembles a DDN-informed pattern around..., This should be validated against reference architecture sizing guidance before a BOM.",
    "Do not invent extra building blocks if ddnReferencePattern.buildingBlocks is populated.",
    "Do not claim one-to-one official DDN BOM mapping for the workload.",
    "Structured context:",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
