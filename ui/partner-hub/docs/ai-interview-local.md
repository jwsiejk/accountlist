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

Verify health endpoints:

- `http://127.0.0.1:9000/health`
- `http://127.0.0.1:8000/health`

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
