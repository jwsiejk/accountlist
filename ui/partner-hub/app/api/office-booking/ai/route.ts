import { NextResponse } from "next/server";

import { callOllamaJson, type OllamaMessage } from "@/lib/ollama";

export const dynamic = "force-dynamic";

type AiRequest = {
  message: string;
  context: {
    offices?: { id: number; name: string }[];
    uiState?: {
      officeId?: number;
      dateKey?: string;
      durationMin?: number;
    };
  };
};

type AiExtracted = {
  dateISO?: string;
  timeExact?: string;
  timeWindow?: string;
  durationMinutes?: number;
  officePreferenceId?: number;
  selectionIndex?: number;
};

function normalizeExtracted(raw: Record<string, unknown> | null): AiExtracted {
  if (!raw) return {};
  const out: AiExtracted = {};

  if (typeof raw.dateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateISO.trim())) {
    out.dateISO = raw.dateISO.trim();
  }
  if (typeof raw.timeExact === "string" && raw.timeExact.trim()) {
    out.timeExact = raw.timeExact.trim().slice(0, 40);
  }
  if (typeof raw.timeWindow === "string" && raw.timeWindow.trim()) {
    out.timeWindow = raw.timeWindow.trim().slice(0, 80);
  }
  if (typeof raw.durationMinutes === "number" && Number.isFinite(raw.durationMinutes)) {
    out.durationMinutes = Math.round(raw.durationMinutes);
  }
  if (typeof raw.officePreferenceId === "number" && Number.isFinite(raw.officePreferenceId)) {
    out.officePreferenceId = Math.round(raw.officePreferenceId);
  }
  if (typeof raw.selectionIndex === "number" && Number.isFinite(raw.selectionIndex)) {
    out.selectionIndex = Math.round(raw.selectionIndex);
  }

  return out;
}

function buildSystemPrompt(context: AiRequest["context"]) {
  const offices = Array.isArray(context?.offices) ? context.offices : [];
  const officeSummary = offices.map((o) => `- ${o.id}: ${o.name}`).join("\n");
  const uiState = context?.uiState ? JSON.stringify(context.uiState) : "{}";

  return [
    "You extract scheduling intent from user messages.",
    "Return JSON with this shape only (no extra keys):",
    '{"extracted":{"dateISO?":"YYYY-MM-DD","timeExact?":"string","timeWindow?":"string","durationMinutes?":number,"officePreferenceId?":number,"selectionIndex?":number}}',
    "Only extract fields you are confident about. Do not propose options or availability.",
    "Offices:",
    officeSummary || "(none)",
    "Current UI state:",
    uiState,
  ].join("\n");
}

export async function POST(req: Request) {
  let body: AiRequest | null = null;
  try {
    body = (await req.json()) as AiRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const system = buildSystemPrompt(body.context ?? {});
  const messages: OllamaMessage[] = [{ role: "user", content: body.message.trim() }];

  try {
    const aiJson = await callOllamaJson({ system, messages });
    const extracted = normalizeExtracted(
      aiJson.extracted && typeof aiJson.extracted === "object"
        ? (aiJson.extracted as Record<string, unknown>)
        : null,
    );

    return NextResponse.json(
      { extracted },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI isn't available right now.";
    const friendly = message.includes("AI isn't available")
      ? message
      : "AI isn't available right now. You can still book manually.";
    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}
