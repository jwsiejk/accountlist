"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { withBasePath } from "@/lib/basePath";

type PersonaOption = {
  id: "se-leader" | "peer-engineer" | "sales-exec";
  label: string;
  summary: string;
  systemPrompt: string;
};

type TranscriptEntry = {
  role: "user" | "assistant";
  text: string;
};

const personaOptions: PersonaOption[] = [
  {
    id: "se-leader",
    label: "SE Leader",
    summary: "Strategic sales engineer leader focused on discovery and outcomes.",
    systemPrompt:
      "You are a strategic sales engineering leader conducting a mock interview. Ask concise, high-impact questions about technical discovery, customer outcomes, and leadership. Keep responses under 3 sentences.",
  },
  {
    id: "peer-engineer",
    label: "Peer Engineer",
    summary: "Hands-on peer engineer probing technical depth and tradeoffs.",
    systemPrompt:
      "You are a peer engineer conducting a mock interview. Focus on technical depth, architecture tradeoffs, and implementation details. Keep responses under 3 sentences.",
  },
  {
    id: "sales-exec",
    label: "Sales Exec",
    summary: "Executive sponsor focused on business value and ROI.",
    systemPrompt:
      "You are a sales executive conducting a mock interview. Focus on business impact, ROI, and executive communication. Keep responses under 3 sentences.",
  },
];

const services = [
  { name: "Ollama", url: "http://127.0.0.1:11434" },
  { name: "STT", url: "http://127.0.0.1:9000" },
  { name: "TTS", url: "http://127.0.0.1:8000" },
];

const pickSupportedMimeType = () => {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
};

const parseResponseText = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as Record<string, unknown>;
    const value =
      (typeof data.response === "string" && data.response) ||
      (typeof data.text === "string" && data.text) ||
      (typeof data.transcription === "string" && data.transcription) ||
      (typeof data.message === "string" && data.message) ||
      (typeof data.content === "string" && data.content);
    if (value) {
      return value;
    }
    return JSON.stringify(data);
  }
  return response.text();
};

export function InterviewTool() {
  const [personaId, setPersonaId] = useState<PersonaOption["id"]>("se-leader");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const activePersona = useMemo(
    () => personaOptions.find((option) => option.id === personaId) ?? personaOptions[0],
    [personaId]
  );

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => {
      if (track.readyState !== "ended") {
        track.stop();
      }
    });
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const stopAudioPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audio.currentTime = 0;
    }
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const stopRecorderIfActive = (options?: { skipOnStop?: boolean }) => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return;
    }
    if (options?.skipOnStop) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
    }
    if (recorder.state === "recording") {
      recorder.stop();
    }
  };

  useEffect(() => {
    return () => {
      stopRecorderIfActive({ skipOnStop: true });
      stopAudioPlayback();
      cleanupStream();
    };
  }, []);

  const handleStartRecording = async () => {
    if (isRecording || isProcessing) {
      return;
    }

    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError("Recording isn’t supported in this browser. Try Chrome/Edge.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        const recordingBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        cleanupStream();
        await handleRecordingComplete(recordingBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      cleanupStream();
      setError(
        err instanceof Error
          ? `Microphone error: ${err.message}`
          : "Unable to access microphone. Please check browser permissions."
      );
    }
  };

  const handleStopRecording = () => {
    stopRecorderIfActive();
  };

  const handleRecordingComplete = async (blob: Blob) => {
    if (!blob.size) {
      setError("No audio was captured. Try recording again.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const transcription = await sendToStt(blob);
      if (!transcription) {
        throw new Error("Speech-to-text returned an empty transcription.");
      }

      const responseText = await sendToChat(transcription, activePersona);
      if (!responseText) {
        throw new Error("Chat response was empty.");
      }

      setTranscript((prev) => [
        ...prev,
        { role: "user", text: transcription },
        { role: "assistant", text: responseText },
      ]);

      await sendToTts(responseText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error while processing interview.");
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToStt = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    const response = await fetch(withBasePath("/api/ai-interview/stt"), {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`STT request failed (${response.status}): ${body}`);
    }

    return parseResponseText(response);
  };

  const sendToChat = async (prompt: string, persona: PersonaOption) => {
    const response = await fetch(withBasePath("/api/ai-interview/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        persona: persona.label,
        system: persona.systemPrompt,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Chat request failed (${response.status}): ${body}`);
    }

    return parseResponseText(response);
  };

  const sendToTts = async (text: string) => {
    stopAudioPlayback();

    const response = await fetch(withBasePath("/api/ai-interview/tts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`TTS request failed (${response.status}): ${body}`);
    }

    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    audioUrlRef.current = url;
    const audio = new Audio(url);
    audioRef.current = audio;

    try {
      await audio.play();
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? `Unable to play audio: ${err.message}`
          : "Unable to play audio response."
      );
    }

    audio.onended = () => {
      stopAudioPlayback();
    };
  };

  const handleReset = () => {
    stopRecorderIfActive({ skipOnStop: true });
    stopAudioPlayback();
    cleanupStream();
    setTranscript([]);
    setError(null);
    setIsProcessing(false);
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">Tools</p>
        <h1 className="text-3xl font-semibold text-foreground">AI Interview</h1>
        <p className="max-w-2xl text-sm text-foreground/60">
          Record a response, review the transcript, and hear the AI interviewer&apos;s follow-up. This workflow uses
          local proxy routes for STT, chat, and TTS.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Interview Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
                Persona
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                {personaOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPersonaId(option.id)}
                    disabled={isRecording || isProcessing}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      personaId === option.id
                        ? "border-primary/70 bg-primary/10"
                        : "border-border/60 bg-background hover:border-border"
                    } ${isRecording || isProcessing ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <div className="font-semibold text-foreground">{option.label}</div>
                    <div className="mt-1 text-xs text-foreground/60">{option.summary}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessing}
                className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                  isRecording
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                } ${isProcessing ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {isRecording ? "Stop Recording" : "Push to Talk"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className={`rounded-full border border-border/60 px-6 py-3 text-sm font-semibold text-foreground/70 transition hover:border-border ${
                  isProcessing ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                Reset
              </button>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
                {isProcessing ? "Processing" : isRecording ? "Recording" : "Idle"}
              </span>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transcript.length === 0 ? (
              <p className="text-sm text-foreground/60">No transcripts yet. Record a response to get started.</p>
            ) : (
              <ul className="space-y-3">
                {transcript.map((entry, index) => (
                  <li
                    key={`${entry.role}-${index}`}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      entry.role === "user"
                        ? "border-border/60 bg-background"
                        : "border-primary/40 bg-primary/10"
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
                      {entry.role === "user" ? "You" : activePersona.label}
                    </div>
                    <p className="mt-2 text-sm text-foreground/80">{entry.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Local Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm text-foreground/70">
            {services.map((service) => (
              <li key={service.name} className="flex flex-col gap-1 rounded-lg border border-border/50 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
                  {service.name}
                </span>
                <span className="font-mono text-sm text-foreground/80">{service.url}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
