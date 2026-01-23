"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type StoredInterviewSession = {
  personaId: PersonaOption["id"];
  transcript: TranscriptEntry[];
};

const SESSION_STORAGE_KEY = "ai-interview-session-v1";
const MAX_RECORDING_SECONDS = 60;
const WARNING_RECORDING_SECONDS = 50;

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
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [recordingWarning, setRecordingWarning] = useState<string | null>(null);
  const [recordingNotice, setRecordingNotice] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const recordingStartRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingAutoStoppedRef = useRef(false);
  const copyTimeoutRef = useRef<number | null>(null);

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

  const stopRecorderIfActive = useCallback((options?: { skipOnStop?: boolean }) => {
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
  }, []);

  const handleStopRecording = useCallback(() => {
    stopRecorderIfActive();
  }, [stopRecorderIfActive]);

  useEffect(() => {
    return () => {
      stopRecorderIfActive({ skipOnStop: true });
      stopAudioPlayback();
      cleanupStream();
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, [stopRecorderIfActive]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as StoredInterviewSession;
      if (parsed && parsed.personaId) {
        setPersonaId(parsed.personaId);
      }
      if (parsed && Array.isArray(parsed.transcript)) {
        const sanitized = parsed.transcript.filter(
          (entry): entry is TranscriptEntry =>
            entry &&
            (entry.role === "user" || entry.role === "assistant") &&
            typeof entry.text === "string"
        );
        if (sanitized.length > 0) {
          setTranscript(sanitized);
        }
      }
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload: StoredInterviewSession = {
      personaId,
      transcript,
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  }, [personaId, transcript]);

  useEffect(() => {
    if (!isRecording) {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = null;
      recordingStartRef.current = null;
      recordingAutoStoppedRef.current = false;
      setRecordingElapsed(0);
      setRecordingWarning(null);
      return;
    }

    recordingStartRef.current = Date.now();
    setRecordingElapsed(0);
    setRecordingWarning(null);
    recordingAutoStoppedRef.current = false;

    recordingTimerRef.current = window.setInterval(() => {
      if (!recordingStartRef.current) {
        return;
      }
      const elapsedSeconds = Math.floor((Date.now() - recordingStartRef.current) / 1000);
      setRecordingElapsed(elapsedSeconds);
      if (elapsedSeconds >= WARNING_RECORDING_SECONDS && elapsedSeconds < MAX_RECORDING_SECONDS) {
        setRecordingWarning("Heads up: recordings auto-stop at 60 seconds.");
      } else if (elapsedSeconds < WARNING_RECORDING_SECONDS) {
        setRecordingWarning(null);
      }
      if (elapsedSeconds >= MAX_RECORDING_SECONDS && !recordingAutoStoppedRef.current) {
        recordingAutoStoppedRef.current = true;
        setRecordingWarning(null);
        setRecordingNotice("Recording stopped at 60 seconds to keep answers concise.");
        handleStopRecording();
      }
    }, 1000);

    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      recordingTimerRef.current = null;
    };
  }, [handleStopRecording, isRecording]);

  const handleStartRecording = async () => {
    if (isRecording || isProcessing) {
      return;
    }

    setError(null);
    setRecordingNotice(null);

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

  const buildTranscriptMarkdown = () => {
    const lines = [
      "# AI Interview Transcript",
      "",
      `**Persona:** ${activePersona.label}`,
      "",
    ];

    transcript.forEach((entry) => {
      const header = entry.role === "user" ? "You" : activePersona.label;
      lines.push(`## ${header}`, "", entry.text.trim(), "");
    });

    return lines.join("\n");
  };

  const handleDownloadTranscript = () => {
    const markdown = buildTranscriptMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-interview-transcript.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const buildTranscriptPlainText = () => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}`;
    const lines = [`AI Interview (Persona: ${activePersona.label})`, `Date: ${timestamp}`, ""];

    transcript.forEach((entry) => {
      const speaker = entry.role === "user" ? "You" : "Interviewer";
      lines.push(`${speaker}: ${entry.text.trim()}`, "");
    });

    return lines.join("\n").trimEnd();
  };

  const handleCopyTranscript = async () => {
    if (isProcessing || transcript.length === 0) {
      return;
    }

    const text = buildTranscriptPlainText();
    const showFeedback = (type: "success" | "error", message: string) => {
      setCopyFeedback({ type, message });
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopyFeedback(null);
      }, 2000);
    };

    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);

      const selection = document.getSelection();
      const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
      textarea.select();
      const success = document.execCommand("copy");
      textarea.remove();

      if (selectedRange && selection) {
        selection.removeAllRanges();
        selection.addRange(selectedRange);
      }

      if (!success) {
        throw new Error("Copy command failed.");
      }
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy();
      }
      showFeedback("success", "Copied!");
    } catch (err) {
      try {
        fallbackCopy();
        showFeedback("success", "Copied!");
      } catch {
        showFeedback("error", "Unable to copy. Please copy manually.");
      }
    }
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

  const handleStartInterview = async () => {
    if (isProcessing || isRecording) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    stopAudioPlayback();

    try {
      const prompt = "Begin the interview now. Ask exactly ONE opening question. No preamble.";
      const responseText = await sendToChat(prompt, activePersona);
      if (!responseText) {
        throw new Error("Chat response was empty.");
      }

      setTranscript((prev) => [...prev, { role: "assistant", text: responseText }]);

      await sendToTts(responseText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error while starting interview.");
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
    setRecordingNotice(null);
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
              {transcript.length === 0 && !isRecording ? (
                <button
                  type="button"
                  onClick={handleStartInterview}
                  disabled={isProcessing || isRecording}
                  className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
                    isProcessing || isRecording
                      ? "cursor-not-allowed bg-primary/40 text-primary-foreground/80"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  Start Interview
                </button>
              ) : null}
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
              <button
                type="button"
                onClick={handleDownloadTranscript}
                disabled={isProcessing || transcript.length === 0}
                className={`rounded-full border border-border/60 px-6 py-3 text-sm font-semibold text-foreground/70 transition hover:border-border ${
                  isProcessing || transcript.length === 0 ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                Download Markdown
              </button>
              <button
                type="button"
                onClick={handleCopyTranscript}
                disabled={isProcessing || transcript.length === 0}
                className={`rounded-full border border-border/60 px-6 py-3 text-sm font-semibold text-foreground/70 transition hover:border-border ${
                  isProcessing || transcript.length === 0 ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                Copy Transcript
              </button>
              {copyFeedback ? (
                <span
                  className={`text-xs font-semibold ${
                    copyFeedback.type === "success" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {copyFeedback.message}
                </span>
              ) : null}
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40">
                {isProcessing
                  ? "Processing"
                  : isRecording
                    ? `Recording ${Math.min(recordingElapsed, MAX_RECORDING_SECONDS)}s/${MAX_RECORDING_SECONDS}s`
                    : "Idle"}
              </span>
            </div>

            {recordingWarning ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {recordingWarning}
              </div>
            ) : null}

            {recordingNotice ? (
              <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
                {recordingNotice}
              </div>
            ) : null}

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
