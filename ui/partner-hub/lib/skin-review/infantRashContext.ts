export type InfantRashContext = {
  babyAge: string;
  rashDuration: string;
  dryRoughScaly: boolean;
  itchingScratchingRubbing: boolean;
  oozingDrainageHoneyCrust: boolean;
  blistersVesicles: boolean;
  fever: boolean;
  poorFeeding: boolean;
  actingIllLethargic: boolean;
  eyeSwellingOrEyeRash: boolean;
  rapidSpreadingWorseningRedness: boolean;
  newSkinProducts: boolean;
  formulaFoodChanges: boolean;
  worseWithHeatDroolMilkFriction: boolean;
  eczemaAllergyAsthmaHistory: boolean;
  greasyFlakyScalpEyebrowsEars: boolean;
};

export type InfantRashVisualItem = {
  id: string;
  label: string;
  parentId?: string;
  parentLabel?: string;
  percent?: number;
  childMatches?: InfantRashVisualItem[];
};

const infantAgeTerms = ["infant", "baby", "newborn", "neonatal"];
const faceTerms = ["face", "facial", "cheek", "forehead", "chin", "cephalic"];
const acneLikeInfantCategoryIds = [
  "infant_acneiform_facial_bumps",
  "neonatal_acne",
  "infantile_acne",
  "neonatal_cephalic_pustulosis",
];

const textForItem = (item: InfantRashVisualItem): string =>
  [
    item.id,
    item.label,
    item.parentId,
    item.parentLabel,
    ...(item.childMatches || []).flatMap((child) => [
      child.id,
      child.label,
      child.parentId,
      child.parentLabel,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const isInfantFacialRashReview = (
  items: InfantRashVisualItem[],
): boolean => {
  if (!items.length) {
    return false;
  }

  return items.some((item) => {
    const itemText = textForItem(item);
    const hasKnownInfantAcneCategory = acneLikeInfantCategoryIds.some((id) =>
      itemText.includes(id),
    );
    const hasInfantFaceLanguage =
      infantAgeTerms.some((term) => itemText.includes(term)) &&
      faceTerms.some((term) => itemText.includes(term));

    return hasKnownInfantAcneCategory || hasInfantFaceLanguage;
  });
};

export const hasRequiredInfantRashContext = (
  context: InfantRashContext,
): boolean => Boolean(context.babyAge.trim() && context.rashDuration.trim());

const visualScoreText = (items: InfantRashVisualItem[]) => {
  const top = items[0];
  if (!top) {
    return "No visual ranking items were returned.";
  }

  const score =
    typeof top.percent === "number"
      ? ` (${top.percent.toFixed(1)}% image match score)`
      : "";
  return `Top visual ranking before context: ${top.label}${score}. This is a visual ranking score, not a diagnosis or medical likelihood.`;
};

export const buildInfantFacialRashGuidance = (
  items: InfantRashVisualItem[],
  context: InfantRashContext,
): string => {
  const contextSignals: string[] = [];
  const warnings: string[] = [];
  const differential: string[] = [
    "acne-like infant facial bumps: can remain a leading visual match when bumps are acne-like and there is no dryness, scaling, crusting, blistering, fever, poor feeding, or ill appearance.",
    "eczema/atopic dermatitis: elevated by dry, rough, scaly, itchy, rubbing, recurrent, or family-history/allergy/asthma patterns.",
    "irritant/contact dermatitis: elevated by new soaps, wipes, detergents, lotions, drool, milk residue, friction, or localized irritation.",
    "seborrheic dermatitis/cradle cap: elevated by greasy or flaky scale around the scalp, eyebrows, ears, or face.",
    "heat rash/miliaria: elevated when rash is worse with heat, warmth, sweating, or occlusion.",
  ];

  if (!hasRequiredInfantRashContext(context)) {
    return "Required infant facial rash context is incomplete. Ask baby age and rash duration before showing final guidance.";
  }

  if (
    context.dryRoughScaly ||
    context.itchingScratchingRubbing ||
    context.eczemaAllergyAsthmaHistory
  ) {
    contextSignals.push(
      "Dry, rough, scaly, itchy/rubbing, recurrent, or eczema/allergy/asthma history answers elevate eczema/atopic dermatitis in the differential.",
    );
  }

  if (context.formulaFoodChanges) {
    contextSignals.push(
      "Formula or food changes can be relevant context for the pediatrician when timing lines up with rash onset, while visual rankings alone cannot determine food-related causes.",
    );
  }

  if (context.newSkinProducts || context.worseWithHeatDroolMilkFriction) {
    contextSignals.push(
      "New soaps/wipes/detergents/lotions or worsening with drool, milk residue, or friction elevate irritant/contact dermatitis.",
    );
  }

  if (context.worseWithHeatDroolMilkFriction) {
    contextSignals.push(
      "Worsening with heat, warmth, sweating, or occlusion elevates heat rash/miliaria.",
    );
  }

  if (context.greasyFlakyScalpEyebrowsEars) {
    contextSignals.push(
      "Greasy or flaky scale around the scalp, eyebrows, ears, or face elevates seborrheic dermatitis/cradle cap.",
    );
  }

  if (context.oozingDrainageHoneyCrust) {
    differential.push(
      "infection/crusting concern: oozing, drainage, or yellow/honey-colored crust raises concern for impetigo or secondary infection and should be discussed promptly with a pediatrician.",
    );
    warnings.push(
      "Oozing, drainage, or yellow/honey-colored crust raises an impetigo/secondary infection concern. Contact a pediatrician promptly, especially if spreading or worsening.",
    );
  }

  if (
    context.blistersVesicles ||
    context.fever ||
    context.poorFeeding ||
    context.actingIllLethargic
  ) {
    warnings.push(
      "Blisters/vesicles, fever, poor feeding, or acting ill/lethargic can signal HSV or another vesicular/systemic infection concern. Seek urgent pediatric medical guidance.",
    );
  }

  if (context.eyeSwellingOrEyeRash) {
    warnings.push(
      "Swelling around the eye or rash involving the eye needs urgent pediatrician guidance.",
    );
  }

  if (context.rapidSpreadingWorseningRedness) {
    warnings.push(
      "Rapid spreading or worsening redness should be checked promptly by a pediatrician or clinician.",
    );
  }

  if (!contextSignals.length && !warnings.length) {
    contextSignals.push(
      "With acne-like bumps and no dryness/scaling, crusting, blistering, systemic symptoms, eye involvement, or rapid worsening reported, the acne-like category can remain an acne-like visual match while still overlapping with eczema and irritant dermatitis.",
    );
  }

  return [
    "Infant facial rash visual differential + context review:",
    "Images alone often cannot reliably distinguish infant acne from eczema or irritant dermatitis. The questions below help identify red flags and common context patterns.",
    visualScoreText(items),
    `Context provided: baby age ${context.babyAge.trim()}; rash duration/onset ${context.rashDuration.trim()}.`,
    "Context-refined interpretation:\n" +
      contextSignals.map((signal) => `- ${signal}`).join("\n"),
    "Infant facial rash differential:\n" +
      differential.map((item) => `- ${item}`).join("\n"),
    warnings.length
      ? "Safety triage:\n" + warnings.map((warning) => `- ${warning}`).join("\n")
      : "Safety triage:\n- No urgent red-flag answers were selected. Contact a pediatrician if symptoms are severe, persistent, worsening, near the eye, draining/crusting, blistering, or the baby seems unwell.",
    "Visual rankings are limited to the labels offered to the local model; not shown does not mean ruled out.",
    "This educational review is not a diagnosis and does not replace a pediatrician or clinician.",
  ].join("\n\n");
};
