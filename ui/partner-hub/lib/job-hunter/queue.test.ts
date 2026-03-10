import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isJobSelected, toggleJobSelection } from "./queue";

describe("job apply queue helpers", () => {
  it("adds missing jobs to the selected queue", () => {
    assert.deepEqual(toggleJobSelection(["job-1"], "job-2"), ["job-1", "job-2"]);
  });

  it("removes existing jobs from the selected queue", () => {
    assert.deepEqual(toggleJobSelection(["job-1", "job-2"], "job-2"), ["job-1"]);
  });

  it("checks selected state", () => {
    assert.equal(isJobSelected(["job-1"], "job-1"), true);
    assert.equal(isJobSelected(["job-1"], "job-2"), false);
  });
});
