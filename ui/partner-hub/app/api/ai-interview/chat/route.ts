import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_TIMEOUT_MS = 20_000;

type ChatRequest = {
  prompt: string;
  system?: string;
  persona?: string;
};

function aiInterviewEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_AI_INTERVIEW === "true";
}

function buildSystem(system?: string, persona?: string) {
  const parts = [system?.trim(), persona?.trim()].filter((value) => value);
  return parts.join("\n").trim();
}

export async function POST(req: Request) {
  if (!aiInterviewEnabled()) {
    return NextResponse.json({ error: "AI interview is disabled." }, { status: 404 });
  }

  let body: ChatRequest | null = null;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body?.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  const baseUrl = process.env.AI_INTERVIEW_OLLAMA_URL?.trim() || "http://127.0.0.1:11434";
  const model =
    process.env.AI_INTERVIEW_OLLAMA_MODEL?.trim() ||
    process.env.OLLAMA_MODEL?.trim() ||
    "llama3.2:3b";
  const system = buildSystem(body?.system, body?.persona);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        ...(system ? { system } : {}),
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Ollama request failed.",
          status: resp.status,
          detail: detail.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const data = (await resp.json()) as { response?: string };
    const text = String(data?.response ?? "").trim();

    return NextResponse.json(
      { text },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Ollama request timed out." }, { status: 504 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to reach Ollama.", detail: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
