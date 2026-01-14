import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { resolveMergedSearchDataset } from "./mergedSearchDataset";

describe("merged search dataset selection", () => {
  it("defaults to upload when run dataset is missing but upload exists", () => {
    const selection = resolveMergedSearchDataset("run", {
      hasRunDataset: false,
      hasUploadedDataset: true,
    });

    assert.equal(selection, "upload");
  });

  it("keeps the upload selection even when no upload dataset exists", () => {
    const selection = resolveMergedSearchDataset("upload", {
      hasRunDataset: true,
      hasUploadedDataset: false,
    });

    assert.equal(selection, "upload");
  });

  it("keeps the run selection when run data exists", () => {
    const selection = resolveMergedSearchDataset("run", {
      hasRunDataset: true,
      hasUploadedDataset: true,
    });

    assert.equal(selection, "run");
  });
});
