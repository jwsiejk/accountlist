import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_TIMEOUT_MS = 20_000;

function aiInterviewEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_AI_INTERVIEW === "true";
}

function extractAudioFile(formData: FormData): File | null {
  const file = formData.get("file");
  if (file instanceof File) {
    return file;
  }
  const audio = formData.get("audio");
  return audio instanceof File ? audio : null;
}

export async function POST(req: Request) {
  if (!aiInterviewEnabled()) {
    return NextResponse.json({ error: "AI interview is disabled." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart/form-data body." }, { status: 400 });
  }

  const audioFile = extractAudioFile(formData);
  if (!audioFile) {
    return NextResponse.json({ error: "audio file is required." }, { status: 400 });
  }

  const baseUrl = process.env.AI_INTERVIEW_STT_URL?.trim() || "http://127.0.0.1:9000";
  const model = process.env.AI_INTERVIEW_STT_MODEL?.trim() || "whisper-1";

  const upstream = new FormData();
  upstream.set("file", audioFile, audioFile.name || "audio.webm");
  upstream.set("model", model);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/audio/transcriptions`, {
      method: "POST",
      body: upstream,
      signal: controller.signal,
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return NextResponse.json(
        {
          error: "STT request failed.",
          status: resp.status,
          detail: detail.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const data = (await resp.json()) as { text?: string };
    const text = typeof data?.text === "string" ? data.text : "";

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
      return NextResponse.json({ error: "STT request timed out." }, { status: 504 });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to reach STT service.", detail: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
