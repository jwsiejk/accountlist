export type OllamaMessage = {
  role: "user" | "assistant";
  content: string;
};

type CallOllamaJsonInput = {
  system: string;
  messages: OllamaMessage[];
  model?: string;
  temperature?: number;
  timeoutMs?: number;
};

type OllamaGenerateResponse = {
  response?: string;
};

const DEFAULT_TIMEOUT_MS = 30_000;

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    return null;
  }

  const candidate = trimmed.slice(first, last + 1);
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function buildPrompt(system: string, messages: OllamaMessage[]) {
  const lines = [
    "System:",
    system.trim(),
    "",
    "Return JSON only. No markdown. No extra text.",
    "",
    "Conversation:",
  ];

  for (const message of messages) {
    const roleLabel = message.role === "assistant" ? "Assistant" : "User";
    lines.push(`${roleLabel}: ${message.content.trim()}`);
  }

  lines.push("", "JSON:");
  return lines.join("\n");
}

export async function callOllamaJson({
  system,
  messages,
  model,
  temperature,
  timeoutMs,
}: CallOllamaJsonInput): Promise<Record<string, unknown>> {
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434";
  const resolvedModel = model?.trim() || process.env.OLLAMA_MODEL?.trim() || "llama3.2:3b";
  const prompt = buildPrompt(system, messages);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: resolvedModel,
        prompt,
        stream: false,
        ...(typeof temperature === "number" ? { temperature } : {}),
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      throw new Error(`Ollama request failed (${resp.status}). ${detail.slice(0, 200)}`);
    }

    const data = (await resp.json()) as OllamaGenerateResponse;
    const raw = String(data?.response ?? "");
    const parsed = extractJsonObject(raw);
    if (!parsed) {
      throw new Error("AI response could not be parsed as JSON.");
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI request timed out. Please try again.");
    }
    if (error instanceof Error && error.message === "AI response could not be parsed as JSON.") {
      throw error;
    }

    throw new Error("AI isn't available right now. You can still book manually.");
  } finally {
    clearTimeout(timeout);
  }
}
