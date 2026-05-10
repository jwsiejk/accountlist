import type { Metadata } from "next";

import { SkinReviewTool } from "@/components/skin-review/SkinReviewTool";

export const metadata: Metadata = {
  title: "Skin Image Review",
  description:
    "Upload a skin image for local dermatology-focused visual ranking and red-flag review.",
};

export default function SkinReviewPage() {
  return <SkinReviewTool />;
}
