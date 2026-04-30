import type { BomSummaryRequest } from "./summarize-types";

export function buildBomSummaryPrompt(input: BomSummaryRequest): string {
  return [
    "You are generating a BOM-readiness architecture summary for an AI workload discovery workflow.",
    "Use only the provided structured input and write in plain English.",
    "Opening disclaimer must be exactly:",
    "This is not a final BOM. It is a DDN-informed architecture mapping based on the current workload inputs.",
    "Treat ddnReferencePattern.buildingBlocks as the PRIMARY building block list whenever it is present.",
    "If DDN-informed building blocks are available, do NOT default to generic profile-category headings.",
    "Do NOT use generic headings like Compute, Storage / Data Platform, Network, AI Software, Security / Governance, Services as the main building blocks when more specific DDN-informed building blocks exist.",
    "Start with a short 'closest pattern' paragraph that uses captured values directly and explicitly includes exact values when available (data volume, daily ingest rate, file/object count, query concurrency, model size, GPU requirement, retention period, HA/DR requirements, latency requirement, performance tier, governance/security fields).",
    "Then provide building blocks in the same order as ddnReferencePattern.buildingBlocks (or a clear DDN-informed equivalent only if a block name needs minor wording normalization).",
    "For EACH building block, include all four items:",
    "1) what it does",
    "2) why this workload needs it",
    "3) which captured input values point to it (cite concrete captured values directly)",
    "4) what should be validated before an actual BOM",
    "Write this like a detailed architecture/BOM-readiness explanation, not a generic report.",
    "If the workload resembles Fraud Detection & Investigation, prefer concrete blocks such as unified fraud ingestion, high-throughput low-latency active data platform, metadata/indexing, anomaly detection and scoring, real-time inference, investigator context/retrieval, governance/security/compliance, HA/DR replication, and performance validation/benchmark planning when those blocks are present in ddnReferencePattern.buildingBlocks.",
    "After the building-block explanations, include a concise 'Validation before BOM' section that consolidates key validation checks across latency, ingest burst behavior, active footprint, metadata/index profile, concurrency, model serving, and HA/DR continuity targets using captured values.",
    "End with this exact closing note:",
    "This is an example starting point based on current DDN public reference architecture and platform themes. Actual sizing and final BOM require DDN/customer-specific validation, benchmark expectations, and constraints.",
    "Guardrails: Do NOT output an actual BOM, exact SKU recommendations, node counts, GPU counts, pricing, quotes, or final sizing.",
    "Do not claim official one-to-one DDN BOM mapping certainty.",
    "Structured context:",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
