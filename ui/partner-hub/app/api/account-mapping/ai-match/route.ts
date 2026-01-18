import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AiVerdict = "match" | "no_match" | "unsure";

type AiMatchRequest = {
  vendorName: string;
  partnerName: string;
  vendorNormalized?: string;
  partnerNormalized?: string;
};

type AiMatchResponse = {
  verdict: AiVerdict;
  confidence: number;
  reason?: string;
  model: string;
  latencyMs: number;
};

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeVerdict(value: unknown): AiVerdict {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "match" || raw === "yes" || raw === "true") {
    return "match";
  }
  if (raw === "no_match" || raw === "no" || raw === "false" || raw === "different") {
    return "no_match";
  }
  return "unsure";
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  // First attempt: the whole response is JSON.
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }

  // Fallback: find the first {...} block.
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

function buildPrompt(input: AiMatchRequest) {
  const vendorName = input.vendorName?.trim() ?? "";
  const partnerName = input.partnerName?.trim() ?? "";
  const vendorNormalized = input.vendorNormalized?.trim() ?? "";
  const partnerNormalized = input.partnerNormalized?.trim() ?? "";

  return [
    "You are validating whether two company account names refer to the same real-world company.",
    "Return JSON only. No markdown. No extra text.",
    "Schema:",
    '{"verdict":"match"|"no_match"|"unsure","confidence":0-100,"reason":"short"}',
    "Guidelines:",
    "- Be conservative: prefer 'unsure' over 'match' if uncertain.",
    "- Treat legal suffixes (Inc/LLC/Ltd) as equivalent.",
    "- If the names only share a generic root token or start similarly but have different qualifiers, prefer 'no_match' or 'unsure'.",
    "- Keep reason under 18 words.",
    "",
    `Vendor name: ${vendorName}`,
    `Partner name: ${partnerName}`,
    vendorNormalized ? `Vendor normalized: ${vendorNormalized}` : "",
    partnerNormalized ? `Partner normalized: ${partnerNormalized}` : "",
    "",
    "Return the JSON now.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  let body: AiMatchRequest | null = null;
  try {
    body = (await req.json()) as AiMatchRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.vendorName?.trim() || !body?.partnerName?.trim()) {
    return NextResponse.json(
      { error: "vendorName and partnerName are required" },
      { status: 400 },
    );
  }

  const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL?.trim() || "llama3.2:3b";

  const prompt = buildPrompt(body);

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Ollama request failed",
          status: resp.status,
          detail: text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const data = (await resp.json()) as { response?: string };
    const raw = String(data?.response ?? "").trim();

    const parsed = extractJsonObject(raw);
    if (!parsed) {
      const payload: AiMatchResponse = {
        verdict: "unsure",
        confidence: 0,
        reason: "AI output could not be parsed.",
        model,
        latencyMs,
      };
      return NextResponse.json(payload, { status: 200 });
    }

    const verdict = normalizeVerdict(parsed.verdict);
    const confidence = clampConfidence(parsed.confidence);
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, 220) : "";

    const payload: AiMatchResponse = {
      verdict,
      confidence,
      ...(reason ? { reason } : {}),
      model,
      latencyMs,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to reach Ollama", detail: message, model, latencyMs },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
