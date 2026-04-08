import assert from "node:assert/strict";
import test from "node:test";

import { getHpcLabPresetById } from "./presets";
import {
  buildFormStateFromPreset,
  isFormDirtyAgainstPreset,
  parseFormStateToSimulationInput,
  resetFormStateToPreset,
} from "./form";

const aiPreset = getHpcLabPresetById("ai-training");
if (!aiPreset) {
  throw new Error("Expected ai-training preset");
}

test("buildFormStateFromPreset hydrates editable values and preset simulation defaults", () => {
  const state = buildFormStateFromPreset(aiPreset);

  assert.equal(state.presetId, "ai-training");
  assert.equal(state.computeNodes, String(aiPreset.initialConfig.computeNodes));
  assert.equal(state.totalTicks, String(aiPreset.simulationDefaults?.totalTicks));
  assert.equal(state.tickDurationSeconds, String(aiPreset.simulationDefaults?.tickDurationSeconds));
});

test("parseFormStateToSimulationInput converts valid form input to normalized engine input", () => {
  const state = buildFormStateFromPreset(aiPreset);
  state.computeNodes = "32.9";
  state.totalTicks = "360.7";

  const parsed = parseFormStateToSimulationInput(state);

  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }

  assert.equal(parsed.config.computeNodes, 32);
  assert.equal(parsed.config.totalOsts, parsed.config.ossCount * parsed.config.ostPerOss);
  assert.equal(parsed.options.totalTicks, 360);
});

test("parseFormStateToSimulationInput returns clear errors for invalid numeric fields", () => {
  const state = buildFormStateFromPreset(aiPreset);
  state.computeNodes = "0";
  state.networkBandwidthGbps = "nan";
  state.totalTicks = "";

  const parsed = parseFormStateToSimulationInput(state);

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.errors.computeNodes, "Compute nodes must be a finite number greater than 0.");
    assert.equal(parsed.errors.networkBandwidthGbps, "Network bandwidth must be a finite number greater than 0.");
    assert.equal(parsed.errors.totalTicks, "Simulation duration must be a finite number greater than 0.");
  }
});

test("resetFormStateToPreset restores defaults and clears dirty comparison", () => {
  const edited = buildFormStateFromPreset(aiPreset);
  edited.concurrentJobs = "20";

  assert.equal(isFormDirtyAgainstPreset(edited, aiPreset), true);

  const reset = resetFormStateToPreset(aiPreset);
  assert.equal(isFormDirtyAgainstPreset(reset, aiPreset), false);
  assert.equal(reset.concurrentJobs, String(aiPreset.initialConfig.concurrentJobs));
});
