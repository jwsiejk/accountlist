import assert from "node:assert/strict";
import test from "node:test";

import { getNvidiaGpuTelemetry, parseNvidiaSmiCsv, toSafeGpuError } from "./gpu";

const sampledAt = "2026-06-05T00:00:00.000Z";

test("parseNvidiaSmiCsv parses a valid single-GPU nvidia-smi row", () => {
  const [gpu] = parseNvidiaSmiCsv("0, 68, 4915, 6144, 146.32, 62", sampledAt);

  assert.deepEqual(gpu, {
    index: 0,
    utilizationGpuPercent: 68,
    memoryUsedMb: 4915,
    memoryTotalMb: 6144,
    powerDrawWatts: 146.32,
    temperatureGpuCelsius: 62,
    sampledAt,
    classifications: {
      availability: "Measured",
      utilizationGpuPercent: "Measured",
      memoryUsedMb: "Measured",
      memoryTotalMb: "Measured",
      powerDrawWatts: "Measured",
      temperatureGpuCelsius: "Measured",
    },
  });
});

test("parseNvidiaSmiCsv parses multiple GPU rows", () => {
  const gpus = parseNvidiaSmiCsv("0, 10, 1024, 8192, 40.5, 50\n1, 90, 7000, 8192, 180, 75", sampledAt);

  assert.equal(gpus.length, 2);
  assert.equal(gpus[0]?.index, 0);
  assert.equal(gpus[1]?.index, 1);
  assert.equal(gpus[1]?.utilizationGpuPercent, 90);
  assert.equal(gpus[1]?.memoryTotalMb, 8192);
});

test("parseNvidiaSmiCsv treats missing and unsupported fields as unavailable null values", () => {
  const [gpu] = parseNvidiaSmiCsv("0, N/A, , 6144, Not Supported, [Not Supported]", sampledAt);

  assert.equal(gpu?.index, 0);
  assert.equal(gpu?.utilizationGpuPercent, null);
  assert.equal(gpu?.memoryUsedMb, null);
  assert.equal(gpu?.memoryTotalMb, 6144);
  assert.equal(gpu?.powerDrawWatts, null);
  assert.equal(gpu?.temperatureGpuCelsius, null);
});

test("parseNvidiaSmiCsv falls back to row position when GPU index is unavailable", () => {
  const [first, second] = parseNvidiaSmiCsv("N/A, 1, 2, 3, 4, 5\n, 6, 7, 8, 9, 10", sampledAt);

  assert.equal(first?.index, 0);
  assert.equal(second?.index, 1);
});

test("getNvidiaGpuTelemetry returns unavailable for empty nvidia-smi output", async () => {
  const result = await getNvidiaGpuTelemetry(async () => ({ stdout: "\n", stderr: "" }));

  assert.equal(result.ok, false);
  assert.equal(result.status, "unavailable");
  assert.equal(result.classification, "Measured");
  if (!result.ok) {
    assert.equal(result.error.code, "NVIDIA_SMI_EMPTY_OUTPUT");
  }
});

test("toSafeGpuError shapes missing nvidia-smi errors without stack traces", () => {
  const error = Object.assign(new Error("spawn nvidia-smi ENOENT"), { code: "ENOENT" });
  const safeError = toSafeGpuError(error);

  assert.equal(safeError.code, "NVIDIA_SMI_NOT_FOUND");
  assert.equal(safeError.message, "nvidia-smi is not installed or is not available in PATH.");
  assert.equal(safeError.detail, undefined);
});

test("toSafeGpuError shapes timeout errors safely", () => {
  const error = Object.assign(new Error("Command timed out"), { signal: "SIGTERM" });
  const safeError = toSafeGpuError(error);

  assert.equal(safeError.code, "NVIDIA_SMI_TIMEOUT");
  assert.match(safeError.message, /timeout/);
});
