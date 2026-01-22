import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_TIMEOUT_MS = 20_000;

type TtsRequest = {
  text: string;
  voice?: string;
};

function aiInterviewEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_AI_INTERVIEW === "true";
}

export async function POST(req: Request) {
  if (!aiInterviewEnabled()) {
    return NextResponse.json({ error: "AI interview is disabled." }, { status: 404 });
  }

  let body: TtsRequest | null = null;
  try {
    body = (await req.json()) as TtsRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required." }, { status: 400 });
  }

  const baseUrl = process.env.AI_INTERVIEW_TTS_URL?.trim() || "http://127.0.0.1:8000";
  const model = process.env.AI_INTERVIEW_TTS_MODEL?.trim() || "tts-1";
  const voice = body?.voice?.trim() || "alloy";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        voice,
        input: text,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return NextResponse.json(
        {
          error: "TTS request failed.",
          status: resp.status,
          detail: detail.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const audio = await resp.arrayBuffer();

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "TTS request timed out." }, { status: 504 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to reach TTS service.", detail: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
