import type { Metadata } from "next";

import { MedGemmaReviewTool } from "@/components/medgemma/MedGemmaReviewTool";

export const metadata: Metadata = {
  title: "Local MedGemma Image Review",
  description: "Upload an image for local MedGemma medical-image description and red-flag review.",
};

export default function MedGemmaPage() {
  return <MedGemmaReviewTool />;
}
