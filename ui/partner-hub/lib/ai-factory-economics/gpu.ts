import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type {
  AiFactoryGpuTelemetryResult,
  AiFactoryGpuTelemetrySnapshot,
  AiFactorySafeGpuError,
} from "./types";

export const AI_FACTORY_NVIDIA_SMI_TIMEOUT_MS = 1_500;

const execFileAsync = promisify(execFile);

const defaultExecFileRunner: ExecFileRunner = async (file, args, options) => {
  const result = await execFileAsync(file, [...args], options);

  return {
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
  };
};

const NVIDIA_SMI_ARGS = [
  "--query-gpu=index,utilization.gpu,memory.used,memory.total,power.draw,temperature.gpu",
  "--format=csv,noheader,nounits",
] as const;

type ExecFileRunner = (
  file: string,
  args: readonly string[],
  options: { timeout: number; windowsHide: boolean; maxBuffer: number },
) => Promise<{ stdout: string; stderr: string }>;

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || /^n\/?a$/i.test(trimmed) || /^not supported$/i.test(trimmed) || /^\[not supported\]$/i.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableIndex(value: string, fallbackIndex: number): number | null {
  const parsed = parseNullableNumber(value);
  if (parsed === null) {
    return fallbackIndex;
  }

  return Number.isInteger(parsed) ? parsed : fallbackIndex;
}

export function parseNvidiaSmiCsv(output: string, sampledAt: string): AiFactoryGpuTelemetrySnapshot[] {
  const rows = output
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  return rows.map((row, rowIndex) => {
    const columns = row.split(",").map((column) => column.trim());
    const [index, utilizationGpuPercent, memoryUsedMb, memoryTotalMb, powerDrawWatts, temperatureGpuCelsius] = columns;

    return {
      index: parseNullableIndex(index ?? "", rowIndex),
      utilizationGpuPercent: parseNullableNumber(utilizationGpuPercent ?? ""),
      memoryUsedMb: parseNullableNumber(memoryUsedMb ?? ""),
      memoryTotalMb: parseNullableNumber(memoryTotalMb ?? ""),
      powerDrawWatts: parseNullableNumber(powerDrawWatts ?? ""),
      temperatureGpuCelsius: parseNullableNumber(temperatureGpuCelsius ?? ""),
      sampledAt,
      classifications: {
        availability: "Measured",
        utilizationGpuPercent: "Measured",
        memoryUsedMb: "Measured",
        memoryTotalMb: "Measured",
        powerDrawWatts: "Measured",
        temperatureGpuCelsius: "Measured",
      },
    };
  });
}

export function toSafeGpuError(error: unknown): AiFactorySafeGpuError {
  const message = error instanceof Error ? error.message : "";
  const code = typeof (error as { code?: unknown } | null)?.code === "string" ? String((error as { code: string }).code) : "";
  const signal = typeof (error as { signal?: unknown } | null)?.signal === "string" ? String((error as { signal: string }).signal) : "";

  if (code === "ENOENT") {
    return {
      code: "NVIDIA_SMI_NOT_FOUND",
      message: "nvidia-smi is not installed or is not available in PATH.",
    };
  }

  if (signal === "SIGTERM" || /timed out|timeout/i.test(message)) {
    return {
      code: "NVIDIA_SMI_TIMEOUT",
      message: "nvidia-smi did not respond before the short telemetry timeout.",
    };
  }

  if (/not supported|unsupported/i.test(message)) {
    return {
      code: "NVIDIA_SMI_UNSUPPORTED",
      message: "This NVIDIA telemetry query is not supported by the local driver or GPU.",
    };
  }

  return {
    code: "NVIDIA_SMI_UNAVAILABLE",
    message: "NVIDIA GPU telemetry is unavailable on this machine.",
  };
}

export async function getNvidiaGpuTelemetry(runner: ExecFileRunner = defaultExecFileRunner): Promise<AiFactoryGpuTelemetryResult> {
  const sampledAt = new Date().toISOString();

  try {
    const { stdout } = await runner("nvidia-smi", NVIDIA_SMI_ARGS, {
      timeout: AI_FACTORY_NVIDIA_SMI_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 64 * 1024,
    });
    const gpus = parseNvidiaSmiCsv(stdout, sampledAt);

    if (gpus.length === 0) {
      return {
        ok: false,
        phase: "Phase 5",
        status: "unavailable",
        available: false,
        timeoutMs: AI_FACTORY_NVIDIA_SMI_TIMEOUT_MS,
        checkedAt: sampledAt,
        classification: "Measured",
        gpus: [],
        error: {
          code: "NVIDIA_SMI_EMPTY_OUTPUT",
          message: "nvidia-smi returned no GPU telemetry rows.",
        },
      };
    }

    return {
      ok: true,
      phase: "Phase 5",
      status: "available",
      available: true,
      timeoutMs: AI_FACTORY_NVIDIA_SMI_TIMEOUT_MS,
      checkedAt: sampledAt,
      classification: "Measured",
      defaultGpuIndex: gpus[0]?.index ?? null,
      gpus,
    };
  } catch (error) {
    return {
      ok: false,
      phase: "Phase 5",
      status: "unavailable",
      available: false,
      timeoutMs: AI_FACTORY_NVIDIA_SMI_TIMEOUT_MS,
      checkedAt: sampledAt,
      classification: "Measured",
      gpus: [],
      error: toSafeGpuError(error),
    };
  }
}
