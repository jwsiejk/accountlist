# AI Interview (Local-only)

This feature is intended for local development. It relies on three local services and **proxies them through Next.js API routes** to avoid browser CORS limitations. The browser talks to `/api/ai-interview/*`, and the Next.js server forwards requests to local services running on `127.0.0.1`.

## Local services

Run these services locally (defaults shown):

- **Ollama (LLM)**: `http://127.0.0.1:11434`
- **STT (speech-to-text)**: `http://127.0.0.1:9000`
- **TTS (text-to-speech)**: `http://127.0.0.1:8000`

## Local Services (Docker compose)

These containers are intended for **local development only**.

From `ui/partner-hub/dev/ai-interview`, run:

```
docker compose up -d
```

Ports used:

- `9000` → STT (`/v1/audio/transcriptions`)
- `8000` → TTS (`/v1/audio/speech`)

Note: the first STT request may download the model and take a bit longer.

## Quick Start (Windows PowerShell)

From `ui/partner-hub`, run:

```
.\scripts\ai-interview-services-up.ps1
```

First run may take a couple minutes while images build.

When you're done:

```
.\scripts\ai-interview-services-down.ps1
```

## Healthchecks

Each local service provides a health endpoint that returns JSON:

- `http://127.0.0.1:9000/health` → `{ "ok": true }`
- `http://127.0.0.1:8000/health` → `{ "ok": true }`

## Smoke tests (Windows PowerShell)

From `ui/partner-hub`, run:

```
.\scripts\ai-interview-tts-smoke.ps1
.\scripts\ai-interview-stt-smoke.ps1
```

The TTS command saves output to `ui/partner-hub/tmp/tts-smoke.mp3`. The STT command generates a tiny WAV file in `ui/partner-hub/tmp/stt-smoke.wav` and prints the transcription response.

## Environment variables

Set these in `.env.local` (see `.env.local.example`):

```
NEXT_PUBLIC_ENABLE_AI_INTERVIEW=false
AI_INTERVIEW_OLLAMA_URL=http://127.0.0.1:11434
AI_INTERVIEW_STT_URL=http://127.0.0.1:9000
AI_INTERVIEW_TTS_URL=http://127.0.0.1:8000
```

## Planned proxy routes

These routes will proxy requests to the local services:

- `/api/ai-interview/chat` → Ollama
- `/api/ai-interview/stt` → STT
- `/api/ai-interview/tts` → TTS
