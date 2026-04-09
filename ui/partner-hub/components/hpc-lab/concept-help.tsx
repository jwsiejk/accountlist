import { InfoPopover } from "@/components/hpc-lab/info-popover";
import { InfoTooltip } from "@/components/hpc-lab/info-tooltip";
import { getHpcLabConcept, getHpcLabConceptHelpMode } from "@/lib/hpc-lab/concepts";
import type { HpcLabConceptId } from "@/lib/hpc-lab/types";

type ConceptHelpProps = {
  conceptId: HpcLabConceptId;
  label: string;
  shortHint?: string;
  detailedExplanation?: string;
};

export function ConceptHelp({ conceptId, label, shortHint, detailedExplanation }: ConceptHelpProps) {
  const concept = getHpcLabConcept(conceptId);
  const effectiveShortHint = shortHint ?? concept.shortHint ?? concept.explanation;
  const effectiveDetailedExplanation = detailedExplanation ?? concept.detailedExplanation;
  const helpMode = effectiveDetailedExplanation ? "popover" : getHpcLabConceptHelpMode(conceptId);

  if (helpMode === "popover" && effectiveDetailedExplanation) {
    return <InfoPopover label={label} title={concept.hoverTitle} body={effectiveDetailedExplanation} />;
  }

  return <InfoTooltip label={label} title={concept.hoverTitle} body={effectiveShortHint} />;
}
