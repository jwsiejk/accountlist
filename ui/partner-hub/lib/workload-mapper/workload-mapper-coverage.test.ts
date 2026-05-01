import { describe, expect, it } from "vitest";

import { workloadExamplePresets, workloadLibrary } from "@/components/workload-mapper/workload-mapper-data";
import { getDdnReferencePattern } from "@/components/workload-mapper/workload-mapper-ddn-reference";

describe("workload mapper reference coverage", () => {
  it("ensures each workload has example presets and rich DDN reference patterns", () => {
    for (const workload of workloadLibrary) {
      const preset = workloadExamplePresets[workload.id];
      expect(preset, `${workload.id} missing example preset`).toBeTruthy();

      const pattern = getDdnReferencePattern(workload.id, workload.defaultPattern);
      expect(pattern.closestDdnPattern, `${workload.id} missing closest pattern`).toBeTruthy();
      expect(pattern.buildingBlocks.length, `${workload.id} should have at least 3 building blocks`).toBeGreaterThanOrEqual(3);
      expect(pattern.validationBeforeBom.length, `${workload.id} should include validationBeforeBom entries`).toBeGreaterThan(0);
      expect(pattern.sourceBasis.length, `${workload.id} should include sourceBasis entries`).toBeGreaterThan(0);
    }
  });
});
