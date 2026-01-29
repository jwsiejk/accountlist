# AI Interview TTS (Dev)

## Vendored Piper artifacts
To keep Docker builds deterministic, place the Piper release tarball and default model files in the vendor folder before building:

```
ui/partner-hub/dev/ai-interview/services/tts/vendor/piper_linux_x86_64.tar.gz
ui/partner-hub/dev/ai-interview/services/tts/vendor/en_US-amy-medium.onnx
ui/partner-hub/dev/ai-interview/services/tts/vendor/en_US-amy-medium.onnx.json
```

The Dockerfile copies these files during build and does **not** download Piper or models from the network.

## Local setup (one-time)
- Do **not** commit the vendor artifacts; they are gitignored and meant to stay local.
- Place these files locally:
  - `vendor/piper_linux_x86_64.tar.gz`
  - `vendor/en_US-amy-medium.onnx`
  - `vendor/en_US-amy-medium.onnx.json`
- Optional: if `PIPER_TARBALL_SHA256`, `PIPER_MODEL_SHA256`, or `PIPER_MODEL_JSON_SHA256` are set, their values must match the local files.

## Rebuild

```
docker compose -f ui/partner-hub/dev/ai-interview/docker-compose.yml up -d --build ai-interview-tts
```
