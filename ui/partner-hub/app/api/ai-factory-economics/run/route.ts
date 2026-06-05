import { NextResponse } from "next/server";

import { calculateRunMetrics } from "@/lib/ai-factory-economics/metrics";
import {
  AI_FACTORY_OLLAMA_RUN_TIMEOUT_MS,
  getAiFactoryOllamaBaseUrl,
  normalizeOllamaGenerateChunk,
  openOllamaRunStream,
  toSafeOllamaError,
  validateAiFactoryRunRequest,
} from "@/lib/ai-factory-economics/ollama";
import type { AiFactoryRunMetricsStatus, AiFactorySafeError } from "@/lib/ai-factory-economics/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(error: AiFactorySafeError, status: number) {
  return NextResponse.json(
    { ok: false, error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const requestStartedAtMs = Date.now();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(
      {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON with model and prompt fields.",
      },
      400,
    );
  }

  const validation = validateAiFactoryRunRequest(body);
  if (!validation.ok) {
    return jsonError(validation.error, validation.status);
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), AI_FACTORY_OLLAMA_RUN_TIMEOUT_MS);
  const relayClientAbort = () => abortController.abort();
  request.signal.addEventListener("abort", relayClientAbort, { once: true });

  let upstream: Response;
  try {
    upstream = await openOllamaRunStream(validation.request, fetch, abortController.signal);
  } catch (error) {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", relayClientAbort);
    const safeError = toSafeOllamaError(error, "Could not start the local Ollama prompt run.");
    return jsonError(safeError, safeError.code === "OLLAMA_TIMEOUT" ? 504 : 502);
  }

  const upstreamBody = upstream.body;
  if (!upstreamBody) {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", relayClientAbort);
    return jsonError(
      {
        code: "OLLAMA_BAD_RESPONSE",
        message: "Local Ollama did not return a readable streaming response.",
      },
      502,
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstreamBody.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      let buffer = "";
      let responseText = "";
      let firstChunkAtMs: number | undefined;
      let receivedDone = false;

      const sendMetrics = (status: AiFactoryRunMetricsStatus, completedAtMs?: number) => {
        send("metrics", {
          ...calculateRunMetrics({
            promptText: validation.request.prompt,
            responseText,
            requestStartedAtMs,
            firstChunkAtMs,
            completedAtMs,
            status,
          }),
          eventGeneratedAt: new Date().toISOString(),
        });
      };

      send("meta", {
        ok: true,
        phase: "Phase 8",
        model: validation.request.model,
        baseUrl: getAiFactoryOllamaBaseUrl(),
        classification: "Measured",
        economicsClassification: "Demo/mock",
        message:
          "Streaming response timing is measured from local Ollama. Prompt and response tokens are estimated; tokens/sec is derived. GPU snapshots are separate from this run stream; tokens/watt and real cost telemetry are not included in Phase 8.",
      });

      try {
        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              continue;
            }

            const chunk = normalizeOllamaGenerateChunk(trimmed);
            if (!chunk) {
              send("error", {
                code: "OLLAMA_BAD_RESPONSE",
                message: "Local Ollama returned an unexpected streaming chunk.",
              });
              continue;
            }

            if (chunk.response) {
              if (firstChunkAtMs === undefined) {
                firstChunkAtMs = Date.now();
              }
              responseText += chunk.response;
              send("chunk", {
                response: chunk.response,
                done: false,
                classification: "Measured",
              });
              sendMetrics("running");
            }

            if (chunk.done) {
              receivedDone = true;
              const completedAtMs = Date.now();
              sendMetrics("completed", completedAtMs);
              send("done", {
                ok: true,
                status: "completed",
                classification: "Measured",
                message:
                  "Prompt run completed with Phase 8 measured timing, estimated token counts, and derived throughput. GPU snapshots remain separate; tokens/watt and real cost/run remain unavailable.",
              });
            }
          }

          if (done) {
            if (buffer.trim()) {
              const chunk = normalizeOllamaGenerateChunk(buffer.trim());
              if (chunk?.response) {
                if (firstChunkAtMs === undefined) {
                  firstChunkAtMs = Date.now();
                }
                responseText += chunk.response;
                send("chunk", {
                  response: chunk.response,
                  done: chunk.done,
                  classification: "Measured",
                });
                sendMetrics("running");
              }
              if (chunk?.done && !receivedDone) {
                receivedDone = true;
                const completedAtMs = Date.now();
                sendMetrics("completed", completedAtMs);
                send("done", {
                  ok: true,
                  status: "completed",
                  classification: "Measured",
                  message:
                    "Prompt run completed with Phase 8 measured timing, estimated token counts, and derived throughput. GPU snapshots remain separate; tokens/watt and real cost/run remain unavailable.",
                });
              }
            }
            if (!receivedDone) {
              sendMetrics("incomplete");
            }
            break;
          }
        }
      } catch (error) {
        const safeError = toSafeOllamaError(error, "The local Ollama prompt run failed while streaming.");
        sendMetrics(request.signal.aborted ? "canceled" : "failed");
        send("error", safeError);
      } finally {
        clearTimeout(timeout);
        request.signal.removeEventListener("abort", relayClientAbort);
        controller.close();
      }
    },
    async cancel() {
      clearTimeout(timeout);
      request.signal.removeEventListener("abort", relayClientAbort);
      abortController.abort();
      await reader.cancel().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store, no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
