import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { formatComboboxOptionLabel } from "./comboboxUtils";

describe("Combobox utils", () => {
  it("renders labels with counts", () => {
    assert.equal(formatComboboxOptionLabel({ value: "East", count: 12 }), "East (12)");
    assert.equal(
      formatComboboxOptionLabel({ value: "Jordan", label: "Jordan Lee", count: 18 }),
      "Jordan Lee (18)",
    );
    assert.equal(formatComboboxOptionLabel({ value: "West" }), "West");
  });
});
