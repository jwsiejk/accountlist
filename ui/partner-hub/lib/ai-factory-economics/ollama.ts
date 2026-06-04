import type {
  AiFactoryHealthStatus,
  AiFactoryModelDiscoveryResult,
  AiFactoryRunRequest,
  AiFactoryRunValidationResult,
  AiFactorySafeError,
} from "./types";

export const AI_FACTORY_DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
export const AI_FACTORY_OLLAMA_TIMEOUT_MS = 2_000;
export const AI_FACTORY_OLLAMA_RUN_TIMEOUT_MS = 120_000;
export const AI_FACTORY_PROMPT_MAX_LENGTH = 4_000;
export const AI_FACTORY_MODEL_MAX_LENGTH = 120;

type FetchLike = typeof fetch;

type OllamaModelEntry = {
  name?: unknown;
  model?: unknown;
};

type OllamaTagsResponse = {
  models?: unknown;
};

type OllamaGenerateChunk = {
  response?: unknown;
  done?: unknown;
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
      phase: "Phase 3",
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
        message: "NVIDIA telemetry is not connected in Phase 3.",
      },
      promptExecution: "enabled",
      streaming: "enabled",
    };
  } catch (error) {
    return {
      ok: false,
      phase: "Phase 3",
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
        message: "NVIDIA telemetry is not connected in Phase 3.",
      },
      promptExecution: "enabled",
      streaming: "enabled",
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
      phase: "Phase 3",
      baseUrl,
      timeoutMs: AI_FACTORY_OLLAMA_TIMEOUT_MS,
      classification: "Measured",
      models: normalizeOllamaModelNames(data),
      checkedAt,
    };
  } catch (error) {
    return {
      ok: false,
      phase: "Phase 3",
      baseUrl,
      timeoutMs: AI_FACTORY_OLLAMA_TIMEOUT_MS,
      classification: "Measured",
      models: [],
      checkedAt,
      error: toSafeOllamaError(error, "Could not discover local Ollama models."),
    };
  }
}

export function validateAiFactoryRunRequest(input: unknown): AiFactoryRunValidationResult {
  const body = input as Partial<Record<keyof AiFactoryRunRequest, unknown>> | null;
  const model = typeof body?.model === "string" ? body.model.trim() : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!model) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "MODEL_REQUIRED",
        message: "Choose or enter a local Ollama model before running a prompt.",
      },
    };
  }

  if (model.length > AI_FACTORY_MODEL_MAX_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "MODEL_TOO_LONG",
        message: `Model names must be ${AI_FACTORY_MODEL_MAX_LENGTH} characters or fewer.`,
      },
    };
  }

  if (/\p{C}/u.test(model)) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "MODEL_INVALID",
        message: "Model names cannot include control characters.",
      },
    };
  }

  if (!prompt) {
    return {
      ok: false,
      status: 400,
      error: {
        code: "PROMPT_REQUIRED",
        message: "Enter a prompt before running the local model.",
      },
    };
  }

  if (prompt.length > AI_FACTORY_PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      status: 413,
      error: {
        code: "PROMPT_TOO_LONG",
        message: `Prompts must be ${AI_FACTORY_PROMPT_MAX_LENGTH.toLocaleString()} characters or fewer for this local demo phase.`,
      },
    };
  }

  return {
    ok: true,
    request: { model, prompt },
  };
}

export function buildOllamaRunPayload(request: AiFactoryRunRequest) {
  return {
    model: request.model,
    prompt: request.prompt,
    stream: true,
  };
}

export function normalizeOllamaGenerateChunk(line: string) {
  try {
    const parsed = JSON.parse(line) as OllamaGenerateChunk;
    return {
      response: typeof parsed.response === "string" ? parsed.response : "",
      done: parsed.done === true,
    };
  } catch {
    return null;
  }
}

export async function openOllamaRunStream(
  request: AiFactoryRunRequest,
  fetcher: FetchLike = fetch,
  signal?: AbortSignal,
) {
  const baseUrl = getAiFactoryOllamaBaseUrl();
  const response = await fetcher(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      Accept: "application/x-ndjson, application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOllamaRunPayload(request)),
    signal,
  });

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Ollama returned HTTP ${response.status}.`);
  }

  if (!response.body) {
    throw new Error("Ollama did not return a streaming response body.");
  }

  return response;
}
