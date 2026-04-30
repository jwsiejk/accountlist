import type { BomSummaryRequest } from "./summarize-types";

export function buildBomSummaryPrompt(input: BomSummaryRequest): string {
  return [
    "You are generating a BOM-readiness architecture summary for an AI workload discovery workflow.",
    "Use only the provided structured input.",
    "Opening disclaimer must be exactly:",
    "This is not a final BOM. It is a DDN-informed architecture mapping based on the current workload inputs.",
    "Then provide sections in this order:",
    "1) Closest pattern",
    "2) Building blocks (for each: what it does, why it fits, captured input signals)",
    "3) Validation before BOM",
    "End with this exact closing note:",
    "This is an example starting point based on current DDN public reference architecture and platform themes. Actual sizing and final BOM require DDN/customer-specific validation, benchmark expectations, and constraints.",
    "Guardrails: Do NOT output an actual BOM, SKU recommendations, node counts, GPU counts, pricing, or final sizing.",
    "Do not claim official one-to-one DDN BOM mapping certainty.",
    "Structured context:",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
