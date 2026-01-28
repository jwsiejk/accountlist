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
docker compose up -d --build
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

## TTS model (Piper)

The TTS container uses Piper (neural TTS) with a default English voice baked into the image:

- Default model path: `/models/en_US-amy-medium.onnx`
- Override with `PIPER_MODEL_PATH` (for a different model in the container)

To use a different model, either rebuild the image with a new model file or mount a local model and set
`PIPER_MODEL_PATH` to the mounted path.

Example (from `ui/partner-hub/dev/ai-interview`):

```
PIPER_MODEL_PATH=/models/en_US-amy-medium.onnx docker compose up -d --build
```

### Prosody tuning (optional)

You can tune Piper prosody with environment variables (defaults shown):

```
PIPER_LENGTH_SCALE=1.0   # speaking rate (lower = faster)
PIPER_NOISE_SCALE=0.667  # expressiveness
PIPER_NOISE_W=0.8        # variation
PIPER_SPEAKER_ID=        # optional speaker id (if the model supports it)
```

Example (from `ui/partner-hub/dev/ai-interview`):

```
PIPER_LENGTH_SCALE=0.95 PIPER_NOISE_SCALE=0.75 PIPER_NOISE_W=0.9 docker compose up -d --build
```

## Smoke tests (Windows PowerShell)

From `ui/partner-hub`, run:

```
.\scripts\ai-interview-tts-smoke.ps1
.\scripts\ai-interview-stt-smoke.ps1
```

The TTS command saves output to `ui/partner-hub/tmp/tts-smoke.mp3`. The STT command generates a tiny WAV file in `ui/partner-hub/tmp/stt-smoke.wav` and prints the transcription response. STT smoke uses a silent WAV; an empty transcript is expected but the request should return 200.

## Environment variables

Set these in `.env.local` (see `.env.local.example`):

```
NEXT_PUBLIC_ENABLE_AI_INTERVIEW=false
AI_INTERVIEW_OLLAMA_URL=http://127.0.0.1:11434
AI_INTERVIEW_STT_URL=http://127.0.0.1:9000
AI_INTERVIEW_TTS_URL=http://127.0.0.1:8000
```

## Verify TTS (curl)

From `ui/partner-hub/dev/ai-interview`, run:

```
docker compose build ai-interview-tts
docker compose up -d
curl -X POST http://127.0.0.1:8000/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"input":"Hello from Piper.","response_format":"mp3"}' \
  --output /tmp/tts-sample.mp3 \
  --silent --show-error --write-out "\nHTTP %{http_code} content-type=%{content_type}\n"
ls -lh /tmp/tts-sample.mp3
```

Confirm the response shows `HTTP 200` and `content-type=audio/mpeg`, and the output file is larger than a few KB.

## Planned proxy routes

These routes will proxy requests to the local services:

- `/api/ai-interview/chat` → Ollama
- `/api/ai-interview/stt` → STT
- `/api/ai-interview/tts` → TTS
