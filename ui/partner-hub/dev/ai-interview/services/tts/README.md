# Local TTS Service (Coqui)

This service provides a local OpenAI-compatible TTS endpoint for AI Interview development.

## Endpoints

- `GET /health`
- `GET /debug/info`
- `POST /v1/audio/speech`

## Runtime

- Engine: **Coqui TTS** (`ghcr.io/coqui-ai/tts`)
- Default model: `tts_models/en/vctk/vits`
- GPU: enabled by default through compose (`COQUI_USE_CUDA=true` + `gpus: all`)

## Configuration

- `COQUI_MODEL_NAME` (default: `tts_models/en/vctk/vits`)
- `COQUI_USE_CUDA` (default: `true`)
- `COQUI_SPEAKER` (optional; only used when model supports multi-speaker)
- `TTS_MP3_BITRATE` (default: `192k`, valid range `32k..320k`)

## Notes

- First run downloads model weights and caches them in docker volumes mounted at:
  - `/root/.local/share/tts`
  - `/root/.cache/tts`
- WAV output is generated directly by Coqui inference.
- MP3 output is generated with ffmpeg from the WAV intermediate file.
