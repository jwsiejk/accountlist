import { NextResponse } from "next/server";

import { buildSummarizePrompt } from "@/lib/workload-mapper/summarize-prompt";
import type { WorkloadSummaryRequest, WorkloadSummaryResponse } from "@/lib/workload-mapper/summarize-types";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1";
const OLLAMA_ERROR = "Could not reach local Ollama. Make sure Ollama is running and the configured model is available.";

interface OllamaChatResponse {
  message?: { content?: string };
}

export async function POST(request: Request) {
  let payload: WorkloadSummaryRequest;
  try {
    payload = (await request.json()) as WorkloadSummaryRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [{ role: "user", content: buildSummarizePrompt(payload) }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: OLLAMA_ERROR }, { status: 502 });
    }

    const data = (await response.json()) as OllamaChatResponse;
    const summary = data.message?.content?.trim();
    if (!summary) {
      return NextResponse.json({ error: "Local Ollama returned an empty or malformed response." }, { status: 502 });
    }

    const result: WorkloadSummaryResponse = { summary };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: OLLAMA_ERROR }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
