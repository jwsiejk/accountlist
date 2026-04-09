import assert from "node:assert/strict";
import test from "node:test";

import { getHpcLabConcept, getHpcLabConceptHelpMode, listHpcLabConcepts } from "./concepts";
import type { HpcLabConceptId } from "./types";

const REQUIRED_CONCEPTS: HpcLabConceptId[] = [
  "compute-nodes",
  "gpu-nodes",
  "metadata-latency",
  "oss-count",
  "ost-per-oss",
  "stripe-width",
  "network-bandwidth",
  "shared-scratch",
  "local-scratch",
  "metadata-path",
  "data-path",
];

test("critical concepts exist and have non-empty teaching fields", () => {
  REQUIRED_CONCEPTS.forEach((id) => {
    const concept = getHpcLabConcept(id);
    assert.ok(concept.label.trim().length > 0, `${id} label`);
    assert.ok(concept.hoverTitle.trim().length > 0, `${id} hoverTitle`);
    assert.ok(concept.explanation.trim().length > 0, `${id} explanation`);
    assert.ok(concept.realWorldMapping.trim().length > 0, `${id} realWorldMapping`);
    assert.ok(concept.whyItMatters.trim().length > 0, `${id} whyItMatters`);
  });
});

test("concept honesty aligns with modeled vs conceptual tiers", () => {
  const sharedScratch = getHpcLabConcept("shared-scratch");
  assert.equal(sharedScratch.modeledToday, true);

  const localScratch = getHpcLabConcept("local-scratch");
  assert.equal(localScratch.modeledToday, false);
  assert.match(localScratch.whyItMatters, /not modeled as a separate I\/O path/i);

  const longLivedStorage = getHpcLabConcept("long-lived-storage");
  assert.equal(longLivedStorage.modeledToday, false);
  assert.ok(longLivedStorage.explanation.includes("Durable collaborative"));
});

test("concept helpers are deterministic and stable", () => {
  const first = listHpcLabConcepts();
  const second = listHpcLabConcepts();

  assert.deepEqual(first, second);
  assert.deepEqual(first.map((concept) => concept.id), second.map((concept) => concept.id));

  const metadataFirst = getHpcLabConcept("metadata-path");
  const metadataSecond = getHpcLabConcept("metadata-path");
  assert.deepEqual(metadataFirst, metadataSecond);

  const modesFirst = first.map((concept) => [concept.id, getHpcLabConceptHelpMode(concept.id)] as const);
  const modesSecond = second.map((concept) => [concept.id, getHpcLabConceptHelpMode(concept.id)] as const);
  assert.deepEqual(modesFirst, modesSecond);
});

test("concepts with detailed explanations route to popover mode", () => {
  const localScratch = getHpcLabConcept("local-scratch");
  assert.ok(localScratch.detailedExplanation);
  assert.equal(getHpcLabConceptHelpMode("local-scratch"), "popover");

  const sharedFilesystem = getHpcLabConcept("shared-filesystem");
  assert.ok(sharedFilesystem.detailedExplanation);
  assert.equal(getHpcLabConceptHelpMode("shared-filesystem"), "popover");
});

test("compact concepts route to tooltip mode", () => {
  const queueBurden = getHpcLabConcept("queue-burden");
  assert.ok(queueBurden.shortHint);
  assert.equal(queueBurden.detailedExplanation, undefined);
  assert.equal(getHpcLabConceptHelpMode("queue-burden"), "tooltip");

  const stripeWidth = getHpcLabConcept("stripe-width");
  assert.ok(stripeWidth.shortHint);
  assert.equal(stripeWidth.detailedExplanation, undefined);
  assert.equal(getHpcLabConceptHelpMode("stripe-width"), "tooltip");
});
