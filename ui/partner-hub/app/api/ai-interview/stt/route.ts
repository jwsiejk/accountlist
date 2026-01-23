import { NextResponse } from "next/server";

import { getTurnId, nowMs, serverLog } from "../_debug";

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
  const route = "/api/ai-interview/stt";
  const turnId = getTurnId(req);
  const responseHeaders: Record<string, string> = turnId ? { "x-ai-interview-turn-id": turnId } : {};
  const routeStart = nowMs();
  serverLog("route_in", { route, method: req.method, turnId });
  const logRouteOut = (status: number) => {
    serverLog("route_out", { route, status, ms: nowMs() - routeStart, turnId });
  };
  if (!aiInterviewEnabled()) {
    logRouteOut(404);
    return NextResponse.json({ error: "AI interview is disabled." }, { status: 404, headers: responseHeaders });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    logRouteOut(400);
    return NextResponse.json(
      { error: "Invalid multipart/form-data body." },
      { status: 400, headers: responseHeaders },
    );
  }

  const audioFile = extractAudioFile(formData);
  if (!audioFile) {
    logRouteOut(400);
    return NextResponse.json({ error: "audio file is required." }, { status: 400, headers: responseHeaders });
  }

  const baseUrl = process.env.AI_INTERVIEW_STT_URL?.trim() || "http://127.0.0.1:9000";
  const model = process.env.AI_INTERVIEW_STT_MODEL?.trim() || "whisper-1";

  const upstream = new FormData();
  upstream.set("file", audioFile, audioFile.name || "audio.webm");
  upstream.set("model", model);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstreamUrl = `${baseUrl.replace(/\/$/, "")}/v1/audio/transcriptions`;
    serverLog("upstream_request", { route, upstreamUrl, turnId });
    const upstreamStart = nowMs();
    const resp = await fetch(upstreamUrl, {
      method: "POST",
      body: upstream,
      signal: controller.signal,
    });
    serverLog("upstream_response", {
      route,
      status: resp.status,
      ms: nowMs() - upstreamStart,
      turnId,
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      logRouteOut(502);
      return NextResponse.json(
        {
          error: "STT request failed.",
          status: resp.status,
          detail: detail.slice(0, 500),
        },
        { status: 502, headers: responseHeaders },
      );
    }

    const data = (await resp.json()) as { text?: string };
    const text = typeof data?.text === "string" ? data.text : "";

    logRouteOut(200);
    return NextResponse.json(
      { text },
      {
        headers: {
          "Cache-Control": "no-store",
          ...responseHeaders,
        },
      },
    );
  } catch (error) {
    serverLog("route_error", {
      route,
      ms: nowMs() - routeStart,
      turnId,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error && error.name === "AbortError") {
      logRouteOut(504);
      return NextResponse.json({ error: "STT request timed out." }, { status: 504, headers: responseHeaders });
    }
    const message = error instanceof Error ? error.message : String(error);
    logRouteOut(502);
    return NextResponse.json(
      { error: "Failed to reach STT service.", detail: message },
      { status: 502, headers: responseHeaders },
    );
  } finally {
    clearTimeout(timeout);
  }
}
