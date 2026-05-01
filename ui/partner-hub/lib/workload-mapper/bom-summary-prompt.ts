import type { BomSummaryRequest } from "./summarize-types";

export function buildBomSummaryPrompt(input: BomSummaryRequest): string {
  const bomSummaryContext = {
    workload: input.workload,
    customWorkload: input.customWorkload,
    questionnaire: input.questionnaire,
    knownInputs: input.knownInputs,
    missingInputs: input.missingInputs,
    ddnReferencePattern: input.ddnReferencePattern,
  };

  return [
    "You are generating a BOM-readiness architecture summary for an AI workload discovery workflow.",
    "Use only the provided structured input and write in plain English.",
    "Opening disclaimer must be exactly:",
    "This is not a final BOM. It is a DDN-informed architecture mapping based on the current workload inputs.",
    "End with this exact closing note:",
    "This is an example starting point based on current DDN public reference architecture and platform themes. Actual sizing and final BOM require DDN/customer-specific validation, benchmark expectations, and constraints.",
    "Treat ddnReferencePattern.buildingBlocks as the primary source for solution-shape building blocks whenever present.",
    "Synthesize those building blocks into cohesive architecture paragraphs, and combine closely related blocks when it reads naturally.",
    "Do NOT render the response as a field-by-field dump, checklist, or reference-map object.",
    "Do NOT use repeated labels/headings like 'What it does', 'Why it fits', 'Captured input signals', or 'Validation questions'.",
    "Do NOT expose internal field names from the payload. Use captured values naturally in sentences (for example, describe ingest rates, concurrency, model ranges, retention, latency, governance, and HA/DR expectations in plain language).",
    "Start with a concise closest-pattern paragraph that explicitly uses concrete captured values when available.",
    "Then explain the DDN-informed architecture building blocks as narrative paragraphs in the same overall sequence as ddnReferencePattern.buildingBlocks.",
    "Include validation needs naturally in the narrative and finish with a concise final validation paragraph before the closing note.",
    "Guardrails: Do NOT output an actual BOM, exact SKU recommendations, node counts, GPU counts, pricing, quotes, or final sizing.",
    "Do not claim official one-to-one DDN BOM mapping certainty.",
    "Structured context:",
    JSON.stringify(bomSummaryContext, null, 2),
  ].join("\n");
}
