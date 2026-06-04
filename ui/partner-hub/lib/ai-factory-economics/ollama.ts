import type {
  AiFactoryHealthStatus,
  AiFactoryModelDiscoveryResult,
  AiFactorySafeError,
} from "./types";

export const AI_FACTORY_DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const AI_FACTORY_OLLAMA_TIMEOUT_MS = 2_000;

type FetchLike = typeof fetch;

type OllamaModelEntry = {
  name?: unknown;
  model?: unknown;
};

type OllamaTagsResponse = {
  models?: unknown;
};

export function getAiFactoryOllamaBaseUrl(value = process.env.AI_FACTORY_OLLAMA_URL) {
  const trimmed = value?.trim() || AI_FACTORY_DEFAULT_OLLAMA_URL;
  return trimmed.replace(/\/+$/, "");
}

export function normalizeOllamaModelNames(data: unknown): string[] {
  const response = data as OllamaTagsResponse | null;
  if (!response || !Array.isArray(response.models)) {
    return [];
  }

  const names = response.models
    .map((entry) => {
      const model = entry as OllamaModelEntry | null;
      const rawName = typeof model?.name === "string" ? model.name : model?.model;
      return typeof rawName === "string" ? rawName.trim() : "";
    })
    .filter((name) => name.length > 0);

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}

export function toSafeOllamaError(error: unknown, fallbackMessage = "Local Ollama is unavailable."): AiFactorySafeError {
  if (error instanceof Error && error.name === "AbortError") {
    return {
      code: "OLLAMA_TIMEOUT",
      message: "Local Ollama did not respond before the timeout.",
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      code: "OLLAMA_UNAVAILABLE",
      message: fallbackMessage,
      detail: error.message.slice(0, 180),
    };
  }

  return {
    code: "OLLAMA_UNAVAILABLE",
    message: fallbackMessage,
  };
}

async function fetchOllamaTags(fetcher: FetchLike, baseUrl: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(`${baseUrl}/api/tags`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}.`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getOllamaHealth(fetcher: FetchLike = fetch): Promise<AiFactoryHealthStatus> {
  const baseUrl = getAiFactoryOllamaBaseUrl();
  const checkedAt = new Date().toISOString();

  try {
    await fetchOllamaTags(fetcher, baseUrl, AI_FACTORY_OLLAMA_TIMEOUT_MS);

    return {
      ok: true,
      phase: "Phase 2",
      ollama: {
        status: "available",
        reachable: true,
        baseUrl,
        timeoutMs: AI_FACTORY_OLLAMA_TIMEOUT_MS,
        classification: "Measured",
        checkedAt,
      },
      demoModeAvailable: true,
      nvidiaTelemetry: {
        status: "not_connected",
        classification: "Demo/mock",
        message: "NVIDIA telemetry is not connected in Phase 2.",
      },
      promptExecution: "not_enabled",
      streaming: "not_enabled",
    };
  } catch (error) {
    return {
      ok: false,
      phase: "Phase 2",
      ollama: {
        status: "unavailable",
        reachable: false,
        baseUrl,
        timeoutMs: AI_FACTORY_OLLAMA_TIMEOUT_MS,
        classification: "Measured",
        checkedAt,
        error: toSafeOllamaError(error),
      },
      demoModeAvailable: true,
      nvidiaTelemetry: {
        status: "not_connected",
        classification: "Demo/mock",
        message: "NVIDIA telemetry is not connected in Phase 2.",
      },
      promptExecution: "not_enabled",
      streaming: "not_enabled",
    };
  }
}

export async function discoverOllamaModels(fetcher: FetchLike = fetch): Promise<AiFactoryModelDiscoveryResult> {
  const baseUrl = getAiFactoryOllamaBaseUrl();
  const checkedAt = new Date().toISOString();

  try {
    const data = await fetchOllamaTags(fetcher, baseUrl, AI_FACTORY_OLLAMA_TIMEOUT_MS);

    return {
      ok: true,
      phase: "Phase 2",
      baseUrl,
      timeoutMs: AI_FACTORY_OLLAMA_TIMEOUT_MS,
      classification: "Measured",
      models: normalizeOllamaModelNames(data),
      checkedAt,
    };
  } catch (error) {
    return {
      ok: false,
      phase: "Phase 2",
      baseUrl,
      timeoutMs: AI_FACTORY_OLLAMA_TIMEOUT_MS,
      classification: "Measured",
      models: [],
      checkedAt,
      error: toSafeOllamaError(error, "Could not discover local Ollama models."),
    };
  }
}
