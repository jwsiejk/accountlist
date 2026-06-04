import type { Metadata } from "next";

import { AiFactoryEconomicsTool } from "@/components/ai-factory-economics/ai-factory-economics-tool";

export const metadata: Metadata = {
  title: "AI Factory Economics",
  description: "Local-only Phase 1 shell for AI inference economics with static mock dashboard data.",
};

export default function AiFactoryEconomicsPage() {
  return <AiFactoryEconomicsTool />;
}
