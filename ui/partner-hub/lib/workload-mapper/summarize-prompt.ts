import type { WorkloadSummaryRequest } from "./summarize-types";

const workloadSummaryFocus: Record<string, string> = {
  "Risk Modeling / Stress Testing": "Emphasize portfolio exposure, regulatory readiness, scenario impact, reproducibility, and compressing risk windows.",
  "Trading / Quant Research": "Emphasize validating trading ideas and research signals faster.",
  "Compliance / Document Intelligence": "Emphasize reducing manual review effort, stronger audit/regulatory response, citation-backed evidence, and explainability.",
  "RAG Knowledge Assistant": "Emphasize helping employees find trusted answers faster across governed internal knowledge.",
  "Model Training / Fine-tuning": "Emphasize adapting models to domain language/processes, improving task quality, and governed reproducibility.",
  "Large-scale AI Training": "Emphasize differentiated AI capabilities, keeping GPUs fed, and reducing model iteration time.",
  "Inference Platform": "Emphasize serving AI capabilities reliably with predictable latency and concurrency.",
  "Scientific Simulation": "Emphasize completing simulations faster and shortening time from run to insight.",
  "Genomics / Life Sciences": "Emphasize sample/pipeline turnaround while preserving traceability, reproducibility, and regulated data handling.",
  "Media / Rendering Pipeline": "Emphasize delivering creative/rendering work faster under deadline pressure.",
};

export function buildSummarizePrompt(input: WorkloadSummaryRequest): string {
  const workloadName = input.customWorkload?.workloadName?.trim() || input.workload.name;
  const focusDirective = workloadSummaryFocus[workloadName];
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
    ...(focusDirective ? [focusDirective] : []),
    "Do not focus on DDN reference patterns, BOM mapping, SKUs, pricing, node counts, GPU counts, or final sizing.",
    "Structured context:",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
