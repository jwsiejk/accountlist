import { NextResponse } from "next/server";

import { callOllamaJson, type OllamaMessage } from "@/lib/ollama";

export const dynamic = "force-dynamic";

const INTENTS = ["ask_next", "clarify", "propose_options", "confirm", "book", "edit"] as const;

type Intent = (typeof INTENTS)[number];

type AiRequest = {
  message: string;
  context: {
    offices?: { id: number; name: string }[];
    availabilityContext?: unknown;
    uiState?: {
      officeId?: number;
      dateKey?: string;
      durationMin?: number;
    };
  };
};

type AiExtracted = {
  dateISO?: string;
  timePreference?: string;
  durationMinutes?: number;
  officePreferenceId?: number;
  selectionIndex?: number;
};

type AiOption = {
  label: string;
  officeId: string;
  startISO: string;
  durationMinutes: number;
};

type AiResponse = {
  intent: Intent;
  reply: string;
  extracted: AiExtracted;
  options?: AiOption[];
};

function normalizeIntent(value: unknown): Intent {
  const raw = String(value ?? "").trim();
  const match = INTENTS.find((intent) => intent === raw);
  return match ?? "ask_next";
}

function normalizeExtracted(raw: Record<string, unknown> | null): AiExtracted {
  if (!raw) return {};
  const out: AiExtracted = {};

  if (typeof raw.dateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateISO.trim())) {
    out.dateISO = raw.dateISO.trim();
  }
  if (typeof raw.timePreference === "string" && raw.timePreference.trim()) {
    out.timePreference = raw.timePreference.trim().slice(0, 80);
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

function normalizeOptions(value: unknown): AiOption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: AiOption[] = [];
  for (const option of value) {
    if (!option || typeof option !== "object") continue;
    const obj = option as Record<string, unknown>;
    if (
      typeof obj.label !== "string" ||
      typeof obj.officeId !== "string" ||
      typeof obj.startISO !== "string" ||
      typeof obj.durationMinutes !== "number"
    ) {
      continue;
    }
    const label = obj.label.trim().slice(0, 160);
    if (!label) continue;
    out.push({
      label,
      officeId: obj.officeId,
      startISO: obj.startISO,
      durationMinutes: Math.round(obj.durationMinutes),
    });
  }
  return out.length ? out : undefined;
}

function buildSystemPrompt(context: AiRequest["context"]) {
  const offices = Array.isArray(context?.offices) ? context.offices : [];
  const officeSummary = offices.map((o) => `- ${o.id}: ${o.name}`).join("\n");
  const availability = context?.availabilityContext
    ? JSON.stringify(context.availabilityContext)
    : "{}";
  const uiState = context?.uiState ? JSON.stringify(context.uiState) : "{}";

  return [
    "You help schedule office visits using the provided availability.",
    "Return JSON with this shape:",
    '{"intent":"ask_next|clarify|propose_options|confirm|book|edit","reply":"short","extracted":{"dateISO?":"YYYY-MM-DD","timePreference?":"string","durationMinutes?":number,"officePreferenceId?":number,"selectionIndex?":number},"options":[{"label":"string","officeId":"string","startISO":"string","durationMinutes":number}]}',
    "Reply must be 1-2 sentences.",
    "Use availabilityContext slots when proposing options.",
    "If missing info, ask the next best question.",
    "Offices:",
    officeSummary || "(none)",
    "Current UI state:",
    uiState,
    "Availability context:",
    availability,
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
    const intent = normalizeIntent(aiJson.intent);
    const reply = typeof aiJson.reply === "string" ? aiJson.reply.trim().slice(0, 220) : "";
    const extracted = normalizeExtracted(
      aiJson.extracted && typeof aiJson.extracted === "object"
        ? (aiJson.extracted as Record<string, unknown>)
        : null,
    );
    const options = normalizeOptions(aiJson.options);

    const payload: AiResponse = {
      intent,
      reply: reply || "Got it. Let me check a few options.",
      extracted,
      ...(options ? { options } : {}),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI isn't available right now.";
    const friendly = message.includes("AI isn't available")
      ? message
      : "AI isn't available right now. You can still book manually.";
    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}
