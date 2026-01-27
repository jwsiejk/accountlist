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
  const voice = body?.voice?.trim();
  if (body?.voice !== undefined && !voice) {
    logRouteOut(400);
    return NextResponse.json(
      { error: "voice must be a non-empty string when provided." },
      { status: 400, headers: responseHeaders },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstreamUrl = `${baseUrl.replace(/\/$/, "")}/v1/audio/speech`;
    const requestId = req.headers.get("x-request-id");
    const rawVoicePresent = body?.voice !== undefined;
    const trimmedVoice = voice ?? null;
    const forwardVoice = Boolean(voice);
    serverLog("upstream_request", {
      route,
      upstreamUrl,
      turnId,
      requestId,
      rawVoicePresent,
      trimmedVoice,
      forwardVoice,
    });
    const upstreamStart = nowMs();
    const resp = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: text,
        ...(voice ? { voice } : {}),
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
      let rawBody = "";
      try {
        rawBody = await resp.text();
      } catch (readError) {
        serverLog("upstream_error", {
          route,
          status: resp.status,
          turnId,
          message: readError instanceof Error ? readError.message : String(readError),
        });
        logRouteOut(502);
        return NextResponse.json(
          { error: "TTS upstream response could not be read." },
          { status: 502, headers: responseHeaders },
        );
      }
      const contentType = resp.headers.get("content-type") || "";
      let parsedJson: unknown = null;
      if (contentType.includes("application/json") || rawBody.trim().startsWith("{") || rawBody.trim().startsWith("[")) {
        try {
          parsedJson = JSON.parse(rawBody);
        } catch {
          parsedJson = null;
        }
      }
      logRouteOut(resp.status);
      if (parsedJson) {
        return NextResponse.json(parsedJson, { status: resp.status, headers: responseHeaders });
      }
      const detail = rawBody.trim();
      return NextResponse.json(
        {
          error: "TTS request failed.",
          detail: detail ? detail.slice(0, 500) : "Upstream error without a response body.",
        },
        { status: resp.status, headers: responseHeaders },
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
