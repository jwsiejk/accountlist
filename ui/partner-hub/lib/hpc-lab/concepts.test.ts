import assert from "node:assert/strict";
import test from "node:test";

import { getHpcLabConcept, listHpcLabConcepts } from "./concepts";
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
});
