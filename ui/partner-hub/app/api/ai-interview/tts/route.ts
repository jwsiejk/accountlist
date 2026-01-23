import { NextResponse } from "next/server";

import { getTurnId, nowMs, serverLog } from "../_debug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_TIMEOUT_MS = 20_000;

type TtsRequest = {
  text: string;
  voice?: string;
};

function aiInterviewEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_AI_INTERVIEW === "true";
}

export async function POST(req: Request) {
  const route = "/api/ai-interview/tts";
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

  let body: TtsRequest | null = null;
  try {
    body = (await req.json()) as TtsRequest;
  } catch {
    logRouteOut(400);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: responseHeaders });
  }

  const text = body?.text?.trim();
  if (!text) {
    logRouteOut(400);
    return NextResponse.json({ error: "text is required." }, { status: 400, headers: responseHeaders });
  }

  const baseUrl = process.env.AI_INTERVIEW_TTS_URL?.trim() || "http://127.0.0.1:8000";
  const model = process.env.AI_INTERVIEW_TTS_MODEL?.trim() || "tts-1";
  const voice = body?.voice?.trim() || "alloy";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstreamUrl = `${baseUrl.replace(/\/$/, "")}/v1/audio/speech`;
    serverLog("upstream_request", { route, upstreamUrl, turnId });
    const upstreamStart = nowMs();
    const resp = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        voice,
        input: text,
      }),
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
          error: "TTS request failed.",
          status: resp.status,
          detail: detail.slice(0, 500),
        },
        { status: 502, headers: responseHeaders },
      );
    }

    const audio = await resp.arrayBuffer();

    logRouteOut(200);
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        ...responseHeaders,
      },
    });
  } catch (error) {
    serverLog("route_error", {
      route,
      ms: nowMs() - routeStart,
      turnId,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error && error.name === "AbortError") {
      logRouteOut(504);
      return NextResponse.json({ error: "TTS request timed out." }, { status: 504, headers: responseHeaders });
    }
    const message = error instanceof Error ? error.message : String(error);
    logRouteOut(502);
    return NextResponse.json(
      { error: "Failed to reach TTS service.", detail: message },
      { status: 502, headers: responseHeaders },
    );
  } finally {
    clearTimeout(timeout);
  }
}
