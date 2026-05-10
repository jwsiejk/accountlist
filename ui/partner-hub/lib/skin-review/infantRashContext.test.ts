import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInfantFacialRashGuidance,
  hasRequiredInfantRashContext,
  isInfantFacialRashReview,
  type InfantRashContext,
  type InfantRashVisualItem,
} from "./infantRashContext";

const acneLikeVisualItems: InfantRashVisualItem[] = [
  {
    id: "infant_acneiform_facial_bumps",
    label: "infant facial acne-like bumps",
    percent: 85.9,
    childMatches: [
      { id: "neonatal_acne", label: "neonatal acne / baby acne" },
    ],
  },
  {
    id: "irritation_eczema_like",
    label: "irritation or eczema-like rash",
    percent: 8.1,
  },
];

const baseContext = (
  overrides: Partial<InfantRashContext> = {},
): InfantRashContext => ({
  babyAge: "6 weeks",
  rashDuration: "3 days",
  dryRoughScaly: false,
  itchingScratchingRubbing: false,
  oozingDrainageHoneyCrust: false,
  blistersVesicles: false,
  fever: false,
  poorFeeding: false,
  actingIllLethargic: false,
  eyeSwellingOrEyeRash: false,
  rapidSpreadingWorseningRedness: false,
  newSkinProducts: false,
  formulaFoodChanges: false,
  worseWithHeatDroolMilkFriction: false,
  eczemaAllergyAsthmaHistory: false,
  greasyFlakyScalpEyebrowsEars: false,
  ...overrides,
});

test("infant rash review is detected and cannot produce final guidance without required context", () => {
  assert.equal(isInfantFacialRashReview(acneLikeVisualItems), true);
  const incomplete = baseContext({ babyAge: "", rashDuration: "" });
  assert.equal(hasRequiredInfantRashContext(incomplete), false);

  const guidance = buildInfantFacialRashGuidance(
    acneLikeVisualItems,
    incomplete,
  );
  assert.match(guidance, /Required infant facial rash context is incomplete/);
  assert.doesNotMatch(guidance, /Safety triage:/);
});

test("scores are described as image match scores and not probabilities", () => {
  const guidance = buildInfantFacialRashGuidance(
    acneLikeVisualItems,
    baseContext(),
  );

  assert.match(guidance, /85\.9% image match score/);
  assert.match(guidance, /visual ranking score/);
  assert.doesNotMatch(
    guidance.toLowerCase(),
    /probability|probabilities|chance|diagnosis confidence/,
  );
});

test("dry rough scaly context elevates eczema and dermatitis messaging", () => {
  const guidance = buildInfantFacialRashGuidance(
    acneLikeVisualItems,
    baseContext({ dryRoughScaly: true, itchingScratchingRubbing: true }),
  );

  assert.match(guidance, /elevate eczema\/atopic dermatitis/);
  assert.match(guidance, /irritant\/contact dermatitis/);
});

test("oozing or honey crust triggers impetigo or secondary infection warning", () => {
  const guidance = buildInfantFacialRashGuidance(
    acneLikeVisualItems,
    baseContext({ oozingDrainageHoneyCrust: true }),
  );

  assert.match(guidance, /impetigo\/secondary infection concern/);
  assert.match(guidance, /infection\/crusting concern/);
});

test("vesicles or systemic illness triggers HSV or vesicular warning", () => {
  const guidance = buildInfantFacialRashGuidance(
    acneLikeVisualItems,
    baseContext({ blistersVesicles: true, fever: true, poorFeeding: true }),
  );

  assert.match(
    guidance,
    /HSV or another vesicular\/systemic infection concern/,
  );
  assert.match(guidance, /urgent pediatric medical guidance/);
});

test("eye swelling or rash involving eye triggers urgent pediatrician warning", () => {
  const guidance = buildInfantFacialRashGuidance(
    acneLikeVisualItems,
    baseContext({ eyeSwellingOrEyeRash: true }),
  );

  assert.match(
    guidance,
    /rash involving the eye needs urgent pediatrician guidance/,
  );
});

test("acne-like visual match still shows eczema and irritant dermatitis overlap differential", () => {
  const guidance = buildInfantFacialRashGuidance(
    acneLikeVisualItems,
    baseContext(),
  );

  assert.match(guidance, /acne-like category can remain an acne-like visual match/);
  assert.match(guidance, /eczema\/atopic dermatitis/);
  assert.match(guidance, /irritant\/contact dermatitis/);
  assert.match(
    guidance,
    /Images alone often cannot reliably distinguish infant acne from eczema or irritant dermatitis/,
  );
  assert.match(guidance, /not shown does not mean ruled out/i);
});
